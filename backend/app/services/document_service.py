import pdfplumber
import io
import time
import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db.client import get_db
from app.services.gemini_service import gemini

logger = logging.getLogger(__name__)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    page_texts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                page_texts.append(page_text)
    return "\n\n".join(page_texts)


def create_notification(db, title: str, body: str, notif_type: str, doc_id: str | None = None):
    row = {"title": title, "body": body, "type": notif_type}
    if doc_id:
        row["related_document_id"] = doc_id
    try:
        db.table("notifications").insert(row).execute()
    except Exception as e:
        logger.error(f"failed to create notification: {e}")


async def ingest_document(doc_id: str, file_bytes: bytes | None = None, raw_text: str | None = None):
    """
    Full ingestion pipeline (runs as background task):
    1. Extract text
    2. Chunk text
    3. Embed each chunk via Gemini
    4. Store chunks + embeddings in document_chunks
    5. Update document status to indexed
    """
    db = get_db()

    try:
        # extract text
        if file_bytes:
            extracted_text = extract_text_from_pdf(file_bytes)
        elif raw_text:
            extracted_text = raw_text
        else:
            raise ValueError("no content provided to ingest_document")

        if not extracted_text.strip():
            db.table("documents").update({"status": "failed"}).eq("id", doc_id).execute()
            create_notification(
                db,
                "document indexing failed",
                "could not extract text from the uploaded document. please check the file.",
                "upload_failed",
                doc_id
            )
            return

        # cache raw text
        db.table("documents").update({
            "raw_text": extracted_text,
            "status": "processing"
        }).eq("id", doc_id).execute()

        # split into chunks
        chunk_list = text_splitter.split_text(extracted_text)
        logger.info(f"document {doc_id}: split into {len(chunk_list)} chunks")

        # embed and store in batches
        batch_size = 5
        for batch_start in range(0, len(chunk_list), batch_size):
            batch = chunk_list[batch_start : batch_start + batch_size]
            rows_to_insert = []

            for chunk_offset, chunk_text in enumerate(batch):
                chunk_index = batch_start + chunk_offset
                try:
                    embedding_vector = gemini.embed_text(chunk_text)
                    rows_to_insert.append({
                        "document_id": doc_id,
                        "chunk_index": chunk_index,
                        "chunk_text": chunk_text,
                        "embedding": embedding_vector,
                        "token_count": len(chunk_text.split())
                    })
                except Exception as e:
                    logger.error(f"embedding failed for chunk {chunk_index}: {e}")

            if rows_to_insert:
                db.table("document_chunks").insert(rows_to_insert).execute()

            # rate limit buffer between batches
            if batch_start + batch_size < len(chunk_list):
                time.sleep(1)

        # mark indexed
        db.table("documents").update({"status": "indexed"}).eq("id", doc_id).execute()

        create_notification(
            db,
            "document indexed successfully",
            f"document is now searchable. {len(chunk_list)} chunks embedded.",
            "info",
            doc_id
        )
        logger.info(f"document {doc_id} indexed with {len(chunk_list)} chunks")

    except Exception as e:
        logger.error(f"ingestion failed for document {doc_id}: {e}")
        db.table("documents").update({"status": "failed"}).eq("id", doc_id).execute()
        create_notification(
            db,
            "document indexing failed",
            f"an error occurred: {str(e)[:200]}",
            "upload_failed",
            doc_id
        )
