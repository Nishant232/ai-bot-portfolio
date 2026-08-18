# 🤖 AI Representative Portfolio Challenge

> Build your own AI version of yourself! Instead of sending recruiters a static resume, send them an interactive website where they can chat with your AI representative, evaluate role fit, and explore your projects.

![AI Portfolio Banner](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20Groq%20API-indigo?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## ✨ Features

- 💬 **Interactive Candidate AI Agent**: Speaks in first-person as the candidate, answering recruiter questions strictly grounded in `candidate_profile.json` (zero hallucinations).
- ⚡ **Server-Sent Events (SSE) Streaming**: Real-time token-by-token response generation powered by Groq's high-speed `llama-3.3-70b-versatile` model.
- 🎯 **Job Description (JD) Suitability Analyzer**: HR can paste any job description to instantly receive a 0–100% suitability match score, key strengths, skill gaps, and hiring recommendation.
- 🎙️ **Voice Control Assistant**: Built-in Speech-to-Text (microphone input) and Text-to-Speech (read answers aloud).
- 🔍 **Candidate Data Inspector**: Interactive modal allowing recruiters to inspect the raw JSON data grounding the AI to verify accuracy.
- 🎨 **Modern Glassmorphic UI**: High-end responsive design with dark/light mode toggle, suggested prompt chips, auto-scroll, and Markdown chat exporter.

---

## 🛠️ Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI**: Asynchronous web framework serving REST & SSE streaming endpoints.
- **Pydantic v2**: Data validation schemas for profile data and API payloads.
- **Groq API / HTTPX**: Ultra-fast LLM inference API (`llama-3.3-70b-versatile`).

### Frontend
- **React 18 + Vite**: Lightning-fast web application build tool.
- **Vanilla CSS Tokens**: Glassmorphism design system with custom CSS variables.
- **Lucide Icons & React Markdown**: Clean UI icons & formatted message rendering.
- **Web Speech API**: Browser-native Speech Recognition & Speech Synthesis.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+) & npm
- Python (3.10+)
- (Optional) Free [Groq API Key](https://console.groq.com)

---

### 1. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows activate:
venv\Scripts\activate
# Mac/Linux activate:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Copy environment template and add your Groq API key
cp .env.example .env
```

Start the FastAPI server:
```bash
python main.py
# Server runs at http://localhost:8000
```

> **Note**: If `GROQ_API_KEY` is omitted, the backend automatically uses an intelligent built-in streaming fallback so you can test immediately without any external setup!

---

### 2. Setup Frontend

Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
# App runs at http://localhost:5173
```

---

## 📁 Directory Structure

```
AI bot portfolio/
├── backend/
│   ├── data/
│   │   └── candidate_profile.json  # Candidate structured profile data
│   ├── main.py                     # FastAPI application & endpoints
│   ├── schemas.py                  # Pydantic validation schemas
│   ├── prompts.py                  # System persona & JD analysis prompts
│   ├── llm_service.py              # Groq API streaming & fallback generator
│   ├── verify_schema.py            # Senior schema check script
│   ├── requirements.txt            # Python dependencies
│   └── render.yaml                 # Render deployment configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx          # Candidate banner & social links
│   │   │   ├── ChatBox.jsx         # Message stream & auto-scroll container
│   │   │   ├── MessageItem.jsx     # Markdown renderer, TTS & copy controls
│   │   │   ├── InputArea.jsx       # Voice STT mic, textarea & export controls
│   │   │   ├── QuickPrompts.jsx    # Recruiter starter chips
│   │   │   ├── JDAnalyzerModal.jsx # 0-100% Suitability score gauge
│   │   │   └── ProfileViewerModal.jsx # Candidate data inspector
│   │   ├── services/
│   │   │   └── api.js              # SSE streaming & API client
│   │   ├── App.jsx                 # Main layout & state manager
│   │   ├── index.css               # Glassmorphic CSS design system
│   │   └── main.jsx                # React entry point
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json                 # Vercel deployment configuration
│
├── README.md                       # Project documentation
└── todo.md                         # Task checklist & senior verification logs
```

---

## 🌐 Deployment

### Deploy Backend (Render / Koyeb)
1. Push your repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Connect your repository and set root directory to `backend`.
4. Add Environment Variable: `GROQ_API_KEY`.
5. Deploy!

### Deploy Frontend (Vercel)
1. Import your repository into [Vercel](https://vercel.com).
2. Set root directory to `frontend`.
3. Set Framework Preset to **Vite**.
4. Set Environment Variable: `VITE_API_BASE_URL` = `https://your-backend.onrender.com`.
5. Deploy!

---

## 📜 License
Licensed under the [MIT License](LICENSE).
