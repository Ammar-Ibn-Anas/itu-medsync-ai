import time
import logging
from datetime import datetime, timezone
from app.db.client import get_db
from app.services.gemini_service import gemini

logger = logging.getLogger(__name__)

BATCH_SIZE   = 5
BATCH_SLEEP  = 2  # seconds between batches


def fail_audit(db, audit_id: str, reason: str):
    db.table("audit_reports").update({
        "status": "failed",
        "summary_text": f"audit failed: {reason}",
        "completed_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", audit_id).execute()


async def run_audit(
    audit_id: str,
    document_id: str,
    mode: str,
    trusted_source_doc_id: str | None = None
):
    """
    Full audit orchestration. Runs as a FastAPI BackgroundTask.
    mode: "web_grounded" | "source_doc"
    """
    db = get_db()

    try:
        # fetch document info
        doc_response = db.table("documents").select("id, title").eq("id", document_id).single().execute()
        doc_title    = doc_response.data.get("title", "unknown document") if doc_response.data else "unknown document"

        # fetch all chunks ordered by chunk_index
        chunks_response = db.table("document_chunks")\
            .select("id, chunk_text, chunk_index")\
            .eq("document_id", document_id)\
            .order("chunk_index")\
            .execute()
        chunk_list = chunks_response.data

        if not chunk_list:
            fail_audit(db, audit_id, "no indexed chunks found for this document")
            return

        logger.info(f"audit {audit_id}: processing {len(chunk_list)} chunks, mode={mode}")

        findings_list = []

        for batch_start in range(0, len(chunk_list), BATCH_SIZE):
            batch = chunk_list[batch_start : batch_start + BATCH_SIZE]

            for chunk in batch:
                chunk_text = chunk["chunk_text"]
                finding    = {"note_chunk_id": chunk["id"], "chunk_text": chunk_text}

                try:
                    if mode == "web_grounded":
                        result = gemini.audit_chunk_web_grounded(chunk_text)

                    elif mode == "source_doc" and trusted_source_doc_id:
                        # embed chunk as a retrieval query
                        query_embedding = gemini.embed_query(chunk_text)

                        # ANN search in the trusted source document
                        similar_response = db.rpc("match_chunks", {
                            "query_embedding": query_embedding,
                            "source_doc_id": trusted_source_doc_id,
                            "match_count": 3,
                            "similarity_threshold": 0.60
                        }).execute()

                        if not similar_response.data:
                            result = {
                                "status": "Missing Context",
                                "explanation": "no similar content found in the trusted source",
                                "specific_change": None,
                                "evidence_snippet": "",
                                "evidence_source": "trusted source document"
                            }
                        else:
                            context_text = "\n---\n".join([r["chunk_text"] for r in similar_response.data])
                            src_response = db.table("documents").select("title").eq("id", trusted_source_doc_id).single().execute()
                            source_name  = src_response.data.get("title", "trusted source") if src_response.data else "trusted source"
                            result = gemini.audit_chunk_with_context(chunk_text, context_text, source_name)

                    else:
                        # fallback: web grounded
                        result = gemini.audit_chunk_web_grounded(chunk_text)

                    finding.update(result)

                except Exception as e:
                    logger.error(f"chunk audit error in audit {audit_id}: {e}")
                    finding.update({
                        "status": "Error",
                        "explanation": f"ai service error: {str(e)[:100]}",
                        "specific_change": None,
                        "evidence_snippet": "",
                        "evidence_source": ""
                    })

                findings_list.append(finding)

            # rate limit buffer
            if batch_start + BATCH_SIZE < len(chunk_list):
                time.sleep(BATCH_SLEEP)

        # tally results
        contradiction_count  = sum(1 for f in findings_list if f.get("status") == "Contradiction")
        missing_count        = sum(1 for f in findings_list if f.get("status") == "Missing Context")
        aligned_count        = sum(1 for f in findings_list if f.get("status") == "Aligned")

        # generate plain english summary
        summary_text = gemini.generate_report_summary(findings_list, doc_title)

        # save completed report
        db.table("audit_reports").update({
            "status": "completed",
            "contradiction_count": contradiction_count,
            "missing_context_count": missing_count,
            "aligned_count": aligned_count,
            "total_chunks_audited": len(chunk_list),
            "summary_text": summary_text,
            "findings": findings_list,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", audit_id).execute()

        # update document timestamps
        now_iso = datetime.now(timezone.utc).isoformat()
        db.table("documents").update({
            "last_audited_at": now_iso,
            "last_verified_at": now_iso
        }).eq("id", document_id).execute()

        # create notification
        if contradiction_count > 0:
            notif_title = f"⚠️ critical drift detected: {doc_title}"
            notif_body  = f"{contradiction_count} contradiction(s) found. {summary_text[:200]}"
            notif_type  = "critical_drift"
        else:
            notif_title = f"audit complete: {doc_title}"
            notif_body  = f"no contradictions. {missing_count} sections may need updating. {summary_text[:150]}"
            notif_type  = "audit_complete"

        db.table("notifications").insert({
            "title": notif_title,
            "body": notif_body,
            "type": notif_type,
            "related_document_id": document_id,
            "related_audit_id": audit_id
        }).execute()

        logger.info(f"audit {audit_id} complete: {contradiction_count} contradictions, {missing_count} missing")

    except Exception as e:
        logger.error(f"audit {audit_id} failed with exception: {e}")
        fail_audit(db, audit_id, str(e))
