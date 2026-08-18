"""
FastAPI Server for AI Representative Portfolio Backend.
"""

import json
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # FIX #5: Load .env file at startup (was never loaded before)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from slowapi import Limiter, _rate_limit_exceeded_handler  # FIX #11: Rate limiting
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from schemas import (
    CandidateProfile,
    ChatRequest,
    JDAnalysisRequest,
    JDAnalysisResult
)
from llm_service import stream_chat_response, analyze_job_description

# -----------------------------------------------------------------
# Profile Cache — loaded ONCE at startup (FIX #2: was read per request)
# -----------------------------------------------------------------
DATA_PATH = Path(__file__).parent / "data" / "candidate_profile.json"
_profile_cache: dict = {}


def load_candidate_profile() -> dict:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Candidate profile JSON missing at {DATA_PATH}")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the candidate profile once into memory at server startup."""
    _profile_cache["data"] = load_candidate_profile()
    yield
    _profile_cache.clear()


# -----------------------------------------------------------------
# Rate Limiter (FIX #11)
# -----------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# -----------------------------------------------------------------
# App
# -----------------------------------------------------------------
app = FastAPI(
    title="AI Representative Portfolio API",
    description="Backend service serving candidate AI persona streaming and JD evaluation.",
    version="1.1.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# -----------------------------------------------------------------
# CORS (FIX #1: allow_credentials=True + wildcard is invalid per spec)
# Using allow_credentials=False so wildcard origin is valid.
# For production with cookies/auth, set explicit origins instead.
# -----------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # FIX: was True — incompatible with allow_origins="*"
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------
# Routes
# -----------------------------------------------------------------

@app.get("/api/health", summary="Health Check")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "AI Portfolio Representative API"}


@app.get("/api/profile", response_model=CandidateProfile, summary="Get Candidate Profile")
async def get_profile():
    """Returns the full verified Candidate Profile data."""
    try:
        data = _profile_cache.get("data") or load_candidate_profile()
        return CandidateProfile(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load candidate profile: {str(e)}")


@app.post("/api/chat/stream", summary="Stream Candidate AI Chat Response")
@limiter.limit("20/minute")  # FIX #11: protect Groq quota
async def chat_stream(request: Request, body: ChatRequest):
    """
    Streams LLM candidate persona response as Server-Sent Events (SSE).
    """
    if not body.messages:
        raise HTTPException(status_code=400, detail="Messages payload cannot be empty.")

    profile_dict = _profile_cache.get("data") or load_candidate_profile()

    async def sse_event_generator():
        async for chunk in stream_chat_response(body.messages, profile_dict):
            payload = json.dumps({"content": chunk})
            yield f"data: {payload}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/analyze-jd", response_model=JDAnalysisResult, summary="Analyze Job Description Fit")
@limiter.limit("10/minute")  # FIX #11: JD analysis is more expensive
async def analyze_jd(request: Request, body: JDAnalysisRequest):
    """
    Evaluates candidate profile fit against a provided Job Description.
    """
    if not body.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty.")

    profile_dict = _profile_cache.get("data") or load_candidate_profile()
    try:
        result = await analyze_job_description(body.job_description, profile_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JD Analysis failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
