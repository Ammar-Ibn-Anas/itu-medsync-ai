import json
import requests

OLLAMA_BASE_URL = "http://localhost:11434"
LLM_MODEL = "llama3.2:3b"

def scan_for_references(text: str) -> list[dict]:
    """Scans document text for any referenced sources or links."""
    prompt = f"""You are a reference extraction bot. Read the text below and extract any guidelines, studies, trusted sources, or URLs mentioned.
Return ONLY valid JSON in this format:
[
  {{"name": "Name of the guideline/source", "url": "URL if present, else empty string", "ai_generated": true}}
]

TEXT:
{text[:4000]}  # Limit to 4k chars to avoid overwhelming the 3B model
"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": LLM_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.1}},
            timeout=120
        )
        response.raise_for_status()
        raw = response.json()["response"].strip()
        
        # Clean up markdown
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        
        return json.loads(raw)
    except Exception as e:
        print(f"Reference scan failed: {e}")
        return []

def generate_document_summary(text: str) -> str:
    """Generates a medical summary of the document."""
    prompt = f"""You are a medical assistant. Provide a concise, professional 2-3 paragraph summary of the following medical text. 
Focus on key clinical guidelines, treatments, or protocols mentioned.
Do not use markdown formatting like bold or headers. Just plain text paragraphs.

TEXT:
{text[:4000]}
"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": LLM_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.3}},
            timeout=120
        )
        response.raise_for_status()
        return response.json()["response"].strip()
    except Exception as e:
        print(f"Summary generation failed: {e}")
        return "Summary generation failed."

def compare_with_web_content(doc_text: str, web_content: str, source_name: str) -> dict:
    """Compares a document against fetched web content to detect drift."""
    prompt = f"""You are a clinical drift detector. Compare the OLD_NOTE against the NEW_SOURCE to see if any medical guidelines or facts have changed.
Return ONLY valid JSON in this format:
{{
  "has_changes": true or false,
  "change_summary": "1-2 sentence description of what changed (or 'No changes found')",
  "severity": "none", "minor", or "major",
  "details": "Detailed explanation of the differences"
}}

OLD_NOTE:
{doc_text[:2000]}

NEW_SOURCE ({source_name}):
{web_content[:2000]}
"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": LLM_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.1}},
            timeout=120
        )
        response.raise_for_status()
        raw = response.json()["response"].strip()
        
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        
        return json.loads(raw)
    except Exception as e:
        print(f"Comparison failed: {e}")
        return {
            "has_changes": False,
            "change_summary": "Comparison failed due to AI timeout or error.",
            "severity": "none",
            "details": str(e)
        }
