import google.generativeai as genai
from google.generativeai.types import GenerationConfig
import os
import json
import re

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))


class GeminiService:
    EMBED_MODEL = "models/text-embedding-004"
    GEN_MODEL   = "gemini-2.0-flash"

    def embed_text(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
        result = genai.embed_content(
            model=self.EMBED_MODEL,
            content=text,
            task_type=task_type
        )
        return result["embedding"]

    def embed_query(self, query_text: str) -> list[float]:
        return self.embed_text(query_text, task_type="RETRIEVAL_QUERY")

    def _parse_json_response(self, raw_text: str) -> dict:
        cleaned = re.sub(r"```json|```", "", raw_text).strip()
        return json.loads(cleaned)

    def audit_chunk_web_grounded(self, chunk_text: str) -> dict:
        """
        Uses Gemini native web search grounding to find current guidelines
        and compare against the given chunk. No manual web scraping needed.
        """
        model = genai.GenerativeModel(
            self.GEN_MODEL,
            tools=[{"google_search": {}}]
        )
        prompt = f"""You are a clinical accuracy auditor reviewing medical study material.

I have this excerpt from a medical study note:
"{chunk_text}"

Use your web search capability to find the most current official medical guidelines
relevant to the claims in this note. Then compare the note against what you found.

Respond ONLY with valid JSON — no preamble, no markdown fences:
{{
  "status": "Contradiction" | "Missing Context" | "Aligned",
  "explanation": "One sentence describing the finding.",
  "specific_change": "Exact conflicting value if Contradiction, otherwise null.",
  "evidence_snippet": "Relevant excerpt from current guidelines you found.",
  "evidence_source": "URL or source name of the guideline you found."
}}

Rules:
- Contradiction: note states something factually different from current guidelines
- Missing Context: note is incomplete relative to current guidelines
- Aligned: note accurately reflects current guidelines
- If no relevant guideline found, return Aligned with explanation "No conflicting guideline found."
"""
        response = model.generate_content(prompt)
        try:
            return self._parse_json_response(response.text)
        except Exception:
            return {
                "status": "Aligned",
                "explanation": "Could not parse AI response.",
                "specific_change": None,
                "evidence_snippet": "",
                "evidence_source": ""
            }

    def audit_chunk_with_context(self, chunk_text: str, context_text: str, source_name: str) -> dict:
        """
        Compares chunk against provided context text from an uploaded trusted source document.
        Temperature=0 for deterministic output.
        """
        model = genai.GenerativeModel(self.GEN_MODEL)
        prompt = f"""You are a clinical accuracy auditor.

ORIGINAL_NOTE:
"{chunk_text}"

CURRENT_GUIDELINE_EVIDENCE (from {source_name}):
"{context_text}"

Respond ONLY with valid JSON — no preamble, no markdown fences:
{{
  "status": "Contradiction" | "Missing Context" | "Aligned",
  "explanation": "One sentence describing the finding.",
  "specific_change": "Exact conflicting value if Contradiction, otherwise null.",
  "evidence_snippet": "The exact excerpt from the guideline that supports this finding.",
  "evidence_source": "{source_name}"
}}
"""
        response = model.generate_content(
            prompt,
            generation_config=GenerationConfig(temperature=0.0)
        )
        try:
            return self._parse_json_response(response.text)
        except Exception:
            return {
                "status": "Error",
                "explanation": "Could not parse AI response.",
                "specific_change": None,
                "evidence_snippet": "",
                "evidence_source": source_name
            }

    def generate_report_summary(self, findings: list[dict], doc_title: str) -> str:
        """Generates a plain-English summary for admin notifications."""
        model = genai.GenerativeModel(self.GEN_MODEL)

        contradiction_count = sum(1 for f in findings if f.get("status") == "Contradiction")
        missing_count       = sum(1 for f in findings if f.get("status") == "Missing Context")
        key_examples        = [
            f.get("explanation", "")
            for f in findings
            if f.get("status") == "Contradiction"
        ][:3]

        prompt = f"""Write a 2-3 sentence plain English summary of an AI audit.
Document: "{doc_title}"
Results: {contradiction_count} contradictions found, {missing_count} sections with missing context.
Key issues found: {key_examples}
Write for a busy doctor. Be direct and specific. No jargon."""

        response = model.generate_content(prompt)
        return response.text.strip()


# singleton — import this everywhere
gemini = GeminiService()
