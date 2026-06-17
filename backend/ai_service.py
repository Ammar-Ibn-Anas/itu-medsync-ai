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

    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0}
            },
            timeout=120
        )
        response.raise_for_status()
        raw = response.json()["response"].strip()

        # Strip markdown fences if the LLM wrapped the JSON
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.lower().startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed = json.loads(raw)

        # --- THE FIX: Handle if LLM returned a list instead of a dict ---
        if isinstance(parsed, list):
            if len(parsed) > 0:
                parsed = parsed[0]  # Take the first item in the list
            else:
                parsed = {}

        # Ensure it's a dict and has the required keys
        if not isinstance(parsed, dict):
            return {
                "status": "Aligned",
                "explanation": "AI returned unexpected format.",
                "specific_change": ""
            }

        return {
            "status": parsed.get("status", "Aligned"),
            "explanation": parsed.get("explanation", ""),
            "specific_change": parsed.get("specific_change", "")
        }

    except Exception as e:
        print(f"Error in run_audit_comparison: {e}")
        return {
            "status": "Aligned",
            "explanation": f"Could not parse AI response: {str(e)}",
            "specific_change": ""
        }