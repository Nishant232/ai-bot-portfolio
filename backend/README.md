---
title: AI Portfolio Backend
emoji: 🤖
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# AI Portfolio Backend

FastAPI backend for Nishant's AI Representative Portfolio chatbot — serves the candidate
persona chat stream (SSE) and the Job Description suitability analyzer.

Set the `GROQ_API_KEY` secret in this Space's settings to enable live LLM responses.
Without it, the app runs on a fully grounded offline fallback engine — no functionality
is lost, just less natural phrasing.
