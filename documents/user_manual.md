# MedSync AI - User Manual

## 1. Introduction
MedSync AI is a medical knowledge drift detection platform. It helps medical students and administrators ensure that their study notes are always up-to-date with the latest clinical guidelines by automatically cross-referencing indexed documents against trusted online sources.

## 2. Prerequisites
Before running the project locally, ensure you have the following installed:
- **Node.js** (v18 or higher) for the Frontend
- **Python** (v3.10 or higher) for the Backend
- **Ollama** (Running locally with `llama3.2:3b` and `nomic-embed-text` models pulled)
- **Supabase** Project (for PostgreSQL database and Vector extension)
- **Gemini API Key** (for Google GenAI integration)

## 3. Installation

### 3.1 Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Create a `.env` file in the `backend` directory with your API keys:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_key
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

### 3.2 Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the required NPM packages:
   ```bash
   npm install
   ```

## 4. Running the System

### 4.1 Start the Backend Server
In the activated `backend` terminal, start the FastAPI server:
```bash
uvicorn main:app --reload
```
The backend API will be available at `http://localhost:8000`.

### 4.2 Start the Frontend Server
In the `frontend` terminal, start the Vite development server:
```bash
npm run dev
```
The student and admin portals will be accessible at `http://localhost:5173`.

---

## 5. Walkthrough of Main Features

### 5.1 The Admin Dashboard
1. **Login**: Navigate to `/admin/login` and enter your administrator credentials.
2. **Document Management**: On the Documents page, you can:
   - Click **Upload Document** to add a new PDF study note or provide a link to an online trusted source.
   - Click on a document card's **Edit** button to modify its summary, update its category, or attach **Reference Links** (URLs to trusted clinical guidelines).
   - Click **Replace PDF** to hot-swap a document without losing its metadata.
3. **Knowledge Drift Audit**: 
   - Navigate to the **Audit** tab.
   - Click **Run Global Audit**. The AI agent will extract text from your internal documents, scrape the live text from all attached reference links, and compare them.
   - If medical guidelines have changed, it will flag the document as **Requires Attention** and detail the exact contradictions found.
   - You can also run a **Manual Audit** to compare any two indexed documents side-by-side.

### 5.2 The Student Portal
1. **Browsing Notes**: Navigate to the homepage (`/`) to browse verified study notes. Documents flagged for drift will display their status so students are aware.
2. **Reading Documents**: Click on a document to enter the Document Viewer. Here, you can read an AI-generated summary, preview the first few sections of the text, and view the original PDF embedded directly in the browser.
3. **Bookmarks**: Students can click the **Bookmark** icon on any document to save it to their local collection for quick review later on the `/bookmarks` page.
