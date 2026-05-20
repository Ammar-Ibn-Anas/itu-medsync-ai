# 05 — AI Engine (Gemini Integration)

## Service Files

```
project/backend/app/services/
├── gemini_service.py      ← all Gemini API calls (singleton class)
├── document_service.py    ← ingestion pipeline: parse → chunk → embed → store
├── audit_service.py       ← drift audit orchestration (runs as background task)
└── search_service.py      ← semantic search for student portal
```

---

## `gemini_service.py`

Single class wrapping all Gemini interactions. Import the `gemini` singleton everywhere else.

```python
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
import os, json, re

genai.configure(api_key=os.environ["GEMINI_API_KEY"])


class GeminiService:
    EMBED_MODEL = "models/text-embedding-004"
    GEN_MODEL   = "gemini-2.0-flash"

    def embed_text(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
        result = genai.embed_content(model=self.EMBED_MODEL, content=text, task_type=task_type)
        return result["embedding"]

    def embed_query(self, query: str) -> list[float]:
        return self.embed_text(query, task_type="RETRIEVAL_QUERY")

    def _parse_json(self, raw: str) -> dict:
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)

    def audit_chunk_web_grounded(self, chunk_text: str) -> dict:
        """
        Gemini searches the web and compares the chunk against current guidelines.
        Returns structured JSON: status / explanation / specific_change / evidence_snippet / evidence_source
        """
        model = genai.GenerativeModel(self.GEN_MODEL, tools=[{"google_search": {}}])
        prompt = f"""You are a clinical accuracy auditor.
Chunk from a medical study note: "{chunk_text}"
Use web search to find the most current official medical guidelines relevant to this.
Respond ONLY with valid JSON, no markdown:
{{
  "status": "Contradiction" | "Missing Context" | "Aligned",
  "explanation": "one sentence",
  "specific_change": "exact conflicting value if Contradiction, else null",
  "evidence_snippet": "relevant excerpt from current guidelines",
  "evidence_source": "URL or source name"
}}
Rules: Contradiction = factually different. Missing Context = incomplete vs current guidelines.
Aligned = accurate. If nothing found, return Aligned with explanation "No conflicting guideline found."
"""
        resp = model.generate_content(prompt)
        try:
            return self._parse_json(resp.text)
        except Exception:
            return {"status": "Aligned", "explanation": "Could not parse AI response.",
                    "specific_change": None, "evidence_snippet": "", "evidence_source": ""}

    def audit_chunk_with_context(self, chunk_text: str, context: str, source_name: str) -> dict:
        """Compare chunk against provided context text (source_doc mode)."""
        model = genai.GenerativeModel(self.GEN_MODEL)
        prompt = f"""You are a clinical accuracy auditor.
ORIGINAL_NOTE: "{chunk_text}"
CURRENT_GUIDELINE_EVIDENCE (from {source_name}): "{context}"
Respond ONLY with valid JSON, no markdown:
{{
  "status": "Contradiction" | "Missing Context" | "Aligned",
  "explanation": "one sentence",
  "specific_change": "exact conflicting value if Contradiction, else null",
  "evidence_snippet": "exact excerpt supporting this finding",
  "evidence_source": "{source_name}"
}}"""
        resp = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.0))
        try:
            return self._parse_json(resp.text)
        except Exception:
            return {"status": "Error", "explanation": "Could not parse AI response.",
                    "specific_change": None, "evidence_snippet": "", "evidence_source": source_name}

    def generate_report_summary(self, findings: list[dict], doc_title: str) -> str:
        model = genai.GenerativeModel(self.GEN_MODEL)
        contradiction_count = sum(1 for f in findings if f.get("status") == "Contradiction")
        missing_count       = sum(1 for f in findings if f.get("status") == "Missing Context")
        examples            = [f.get("explanation","") for f in findings if f.get("status") == "Contradiction"][:3]
        prompt = f"""Write a 2-3 sentence plain English summary for a busy doctor.
Document: "{doc_title}"
Results: {contradiction_count} contradictions, {missing_count} sections with missing context.
Key issues: {examples}
Be direct and specific. No jargon."""
        return model.generate_content(prompt).text.strip()


gemini = GeminiService()
```

---

## `document_service.py` — Ingestion Pipeline

```
Upload PDF / paste text
    ↓
Extract text (pdfplumber for PDF, raw string for text)
    ↓
Split into chunks (LangChain RecursiveCharacterTextSplitter, size=500, overlap=50)
    ↓
For each chunk: gemini.embed_text(chunk)
    ↓
Insert chunk + embedding into document_chunks
    ↓
Update document status → "indexed"
    ↓
Create "info" notification
```

Runs as a **FastAPI BackgroundTask** — endpoint returns immediately, processing happens async.
Batches of 5 chunks with 1-second sleep between batches to respect Gemini rate limits.

---

## `audit_service.py` — Audit Orchestration

```
Receive: audit_id, document_id, mode, trusted_source_doc_id?
    ↓
Fetch all document_chunks ordered by chunk_index
    ↓
For each chunk (batched 5 at a time, 2s sleep between batches):
    │
    ├── mode="web_grounded":
    │     gemini.audit_chunk_web_grounded(chunk_text)
    │
    └── mode="source_doc":
          embed chunk as query
          pgvector ANN search in trusted source (top 3 similar chunks)
          gemini.audit_chunk_with_context(chunk_text, context, source_name)
    │
    Append finding dict to findings list
    ↓
Tally contradiction_count / missing_context_count / aligned_count
    ↓
gemini.generate_report_summary(findings, doc_title)
    ↓
Update audit_reports: status="completed", all counts, findings JSON, summary
    ↓
Update documents: last_audited_at, last_verified_at
    ↓
Insert notification:
    - type="critical_drift" if contradiction_count > 0
    - type="audit_complete" otherwise
```

---

## Rate Limit Handling

- Batch size: 5 chunks
- Sleep between batches: 1–2 seconds
- On 429 error: wait 60 seconds, retry once
- On persistent failure: mark chunk as `{ "status": "Error", "explanation": "AI unavailable" }`
- Document never gets stuck — always completes or fails gracefully

---

## Gemini Token Limits

Gemini 2.0 Flash context: 1M tokens. Each audit prompt is ~1000–2000 tokens max. Not a concern.
