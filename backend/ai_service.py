import io
import json
import requests
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Ollama runs locally - no API keys needed
OLLAMA_BASE_URL = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text"   # outputs 768 dims, matches Supabase schema
LLM_MODEL = "llama3.2:3b"

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from a PDF file object."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join([page.extract_text() or "" for page in reader.pages])
    except Exception as e:
        raise Exception(f"PDF Extraction failed: {str(e)}")


def get_embedding(text: str) -> list:
    """Generates a 768-dim vector using local Ollama nomic-embed-text."""
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=60
    )
    response.raise_for_status()
    return response.json()["embedding"]


def run_audit_comparison(note_chunk: str, trusted_chunks: list) -> dict:
    """Compares a study note chunk against trusted source chunks using local LLM."""
    context = "\n---\n".join(trusted_chunks)

    prompt = f"""You are a clinical accuracy auditor. Compare the ORIGINAL_NOTE against the UPDATED_SOURCE.
You MUST respond with ONLY valid JSON and nothing else. No explanation outside the JSON.

ORIGINAL_NOTE: "{note_chunk}"
UPDATED_SOURCE: "{context}"

Respond ONLY with this JSON format:
{{
  "status": "Contradiction" or "Missing Context" or "Aligned",
  "explanation": "One sentence describing the finding.",
  "specific_change": "Exact conflicting phrase if Contradiction, otherwise empty string."
}}"""

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": LLM_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0}
        },
        timeout=120  # local LLM can be slow
    )
    response.raise_for_status()
    raw = response.json()["response"].strip()

    # Strip markdown fences if the LLM wrapped the JSON
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback if the LLM still misbehaves
        return {
            "status": "Aligned",
            "explanation": "Could not parse AI response. Manual review recommended.",
            "specific_change": ""
        }
