import json
import re
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Gemini for all scanner tasks (fast, smart)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
LLM_MODEL = "gemini-3.1-flash-lite"


def scan_for_references(text: str) -> list[dict]:
    """Scans document text for referenced sources or links using GEMINI."""
    prompt = f"""You are a reference extraction bot. Read the text below and extract any guidelines, studies, trusted sources, or URLs mentioned.
Return ONLY valid JSON in this format:
[
  {{"name": "Name of the guideline/source", "url": "URL if present, else empty string"}}
]
If nothing is found, return an empty array [].

TEXT:
{text[:4000]}
"""
    try:
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        
        result = json.loads(response.text)
        if isinstance(result, list) and result:
            return result
    except Exception as e:
        print(f"Gemini reference scan failed: {e}")

    # REGEX FALLBACK
    print("Falling back to regex URL extraction...")
    urls = re.findall(r'https?://[^\s\)\]\>\"\']+', text)
    seen = set()
    refs = []
    for url in urls:
        url = url.rstrip('.,;:')
        if url not in seen:
            seen.add(url)
            refs.append({"name": url, "url": url})
    return refs


def generate_document_summary(text: str) -> str:
    """Generates a medical summary of the document using GEMINI."""
    prompt = f"""You are a medical assistant. Provide a concise, professional 2-3 paragraph summary of the following medical text. 
Focus on key clinical guidelines, treatments, or protocols mentioned.
Do not use markdown formatting like bold or headers. Just plain text paragraphs.

TEXT:
{text[:4000]}
"""
    try:
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.3)
        )
        return response.text.strip()
    except Exception as e:
        print(f"Summary generation failed: {e}")
        return "Summary generation failed."


def compare_with_web_content(doc_text: str, web_content: str, source_name: str) -> dict:
    """Compares a document against fetched web content to detect drift using GEMINI."""
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
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        
        return json.loads(response.text)
    except Exception as e:
        print(f"Comparison failed: {e}")
        return {
            "has_changes": False,
            "change_summary": "Comparison failed due to AI timeout or error.",
            "severity": "none",
            "details": str(e)
        }