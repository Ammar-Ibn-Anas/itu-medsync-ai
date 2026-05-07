# MedSync AI: Medical Content Governance

## Overview
MedSync AI is a RAG-based platform designed to detect **Knowledge Drift** in medical study materials. It uses **Google Gemini 2.0** and **PostgreSQL (pgvector)** to compare existing notes against updated clinical guidelines.

## Tech Stack
- **Frontend:** React.js (Vite) + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL + pgvector)
- **AI Engine:** Google Gemini 2.0 Flash (Deterministic Audit at Temp=0)

## Current Features
- [x] SRS & Architectural Design finalized.
- [x] Database Schema with HNSW indexing defined.
- [x] Technical logic for Semantic Drift detection validated.
