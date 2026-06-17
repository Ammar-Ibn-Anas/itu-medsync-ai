import json
import re
import os
from dotenv import load_dotenv
from ai_service import _generate_with_fallback

load_dotenv()


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
        response_text = _generate_with_fallback(prompt, json_mode=True, temperature=0.1)
        result = json.loads(response_text)
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
        response_text = _generate_with_fallback(prompt, json_mode=False, temperature=0.3)
        return response_text.strip()
    except Exception as e:
        print(f"Summary generation failed: {e}")
        return "Summary generation failed."


def compare_with_web_content(doc_text: str, web_content: str, source_name: str, **kwargs) -> dict:
    """Compares a document against fetched web content to detect drift using GEMINI."""
    
    # THE NEW SMART PROMPT
    prompt = f"""You are an expert Clinical Drift Detector. 

Your task is to compare the OLD_NOTE against the NEW_SOURCE to see if any specific medical guidelines, statistics, or protocols have changed.

CRITICAL INSTRUCTIONS:
1. The OLD_NOTE may contain unrelated text (e.g., general exam prep, other topics). IGNORE any text in the OLD_NOTE that is not relevant to the NEW_SOURCE.
2. ONLY compare the specific medical facts, guidelines, or protocols that are actually mentioned in BOTH texts.
3. If the texts are about completely different topics, set has_changes to false and state "No overlapping medical guidelines found."
4. If you find a change in a specific guideline, set has_changes to true.

Return ONLY valid JSON in this exact format:
{{
  "has_changes": true or false,
  "change_summary": "1-2 sentence description of the specific guideline that changed",
  "severity": "none", "minor", or "major",
  "details": "Detailed explanation of the specific differences found."
}}

OLD_NOTE:
{doc_text[:8000]}

NEW_SOURCE ({source_name}):
{web_content[:8000]}
"""
    try:
        response_text = _generate_with_fallback(prompt, json_mode=True, temperature=0.1)
        return json.loads(response_text)
    except Exception as e:
        print(f"Comparison failed: {e}")
        return {
            "has_changes": False,
            "change_summary": "Comparison failed due to AI timeout or error.",
            "severity": "none",
            "details": str(e)
        }