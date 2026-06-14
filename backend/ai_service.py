import io
import json
import os
from google import genai
from google.genai import types
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv()

# Initialize the NEW official Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from a PDF file object."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join([page.extract_text() or "" for page in reader.pages])
    except Exception as e:
        raise Exception(f"PDF Extraction failed: {str(e)}")

def get_embedding(text: str) -> list:
    """Generates a 768-dim vector using the NEW Gemini SDK."""
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return response.embeddings[0].values

def run_audit_comparison(note_chunk: str, trusted_chunks: list) -> dict:
    """Compares a study note chunk against trusted source chunks."""
    context = "\n---\n".join(trusted_chunks)
    
    prompt = f"""
    You are a clinical accuracy auditor. Compare the note against the updated trusted source.
    Respond ONLY with valid JSON.
    
    ORIGINAL_NOTE: "{note_chunk}"
    UPDATED_SOURCE: "{context}"
    
    JSON FORMAT:
    {{
      "status": "Contradiction"|"Missing Context"|"Aligned",
      "explanation": "One sentence describing the finding.",
      "specific_change": "Exact conflicting phrase if Contradiction."
    }}
    """
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json"
        )
    )
    return json.loads(response.text)