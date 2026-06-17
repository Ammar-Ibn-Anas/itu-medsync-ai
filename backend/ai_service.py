import io
import json
import os
import requests
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Ollama for embeddings (free, unlimited, local)
OLLAMA_BASE_URL = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text"  # 768 dims, matches Supabase schema

# Gemini for heavy LLM tasks (fast, smart)
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
LLM_MODEL = "gemini-3.1-flash-lite"  # 500 RPD limit

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

def _generate_with_fallback(prompt: str, json_mode: bool = True, temperature: float = 0.0) -> str:
    """Tries Gemini models first, falls back to local Ollama if all fail."""
    gemini_models = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"]
    
    config = types.GenerateContentConfig(temperature=temperature)
    if json_mode:
        config.response_mime_type = "application/json"
        
    for model in gemini_models:
        try:
            response = gemini_client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
            return response.text
        except Exception as e:
            print(f"Gemini {model} failed: {e}")
            continue
            
    # Final Fallback to Ollama
    print("Falling back to Ollama llama3.2:3b")
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": temperature}
            },
            timeout=120
        )
        response.raise_for_status()
        return response.json()["response"]
    except Exception as e:
        print(f"Ollama fallback failed: {e}")
        raise Exception("All AI models failed.")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from a PDF file object."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join([page.extract_text() or "" for page in reader.pages])
    except Exception as e:
        raise Exception(f"PDF Extraction failed: {str(e)}")


def get_embedding(text: str) -> list:
    """Generates a 768-dim vector using LOCAL Ollama nomic-embed-text (FREE)."""
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=60
    )
    response.raise_for_status()
    return response.json()["embedding"]


def run_audit_comparison(note_chunk: str, trusted_chunks: list) -> dict:
    """Compares a study note chunk against trusted source chunks using GEMINI (FAST)."""
    context = "\n---\n".join(trusted_chunks)

    prompt = f"""You are a clinical accuracy auditor. Compare the ORIGINAL_NOTE against the UPDATED_SOURCE.
You MUST respond with ONLY valid JSON and nothing else.

ORIGINAL_NOTE: "{note_chunk}"
UPDATED_SOURCE: "{context}"

Respond ONLY with this JSON format:
{{
    "status": "Contradiction" or "Missing Context" or "Aligned",
  "explanation": "One sentence describing the finding.",
  "specific_change": "Exact conflicting phrase if Contradiction, otherwise empty string."
}}"""

    try:
        response_text = _generate_with_fallback(prompt, json_mode=True, temperature=0.0)
        parsed = json.loads(response_text)

        # Handle if LLM returned a list instead of a dict
        if isinstance(parsed, list):
            parsed = parsed[0] if parsed else {}

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