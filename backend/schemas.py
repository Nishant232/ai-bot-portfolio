"""
Pydantic schemas for Candidate Profile, Chat Stream API, and JD Analysis.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class SocialLinks(BaseModel):
    github: str
    linkedin: str
    portfolio: str


class PersonalInfo(BaseModel):
    name: str
    title: str
    headline: str
    bio: str
    email: str
    phone: str
    location: str
    status: str
    social_links: SocialLinks


class EducationItem(BaseModel):
    degree: str
    institution: str
    location: str
    period: str
    cgpa: str
    coursework: List[str] = Field(default_factory=list)


class SkillsCatalog(BaseModel):
    languages: List[str] = Field(default_factory=list)
    frameworks_and_libraries: List[str] = Field(default_factory=list)
    ai_and_llm: List[str] = Field(default_factory=list)
    databases: List[str] = Field(default_factory=list)
    cloud_and_devops: List[str] = Field(default_factory=list)
    security_and_testing: List[str] = Field(default_factory=list)
    payments_and_tools: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    title: str
    tagline: str
    description: str
    tech_stack: List[str]
    github_url: str
    live_url: str
    # Rich architecture and workflow deep-dive fields
    architecture: Optional[Dict[str, Any]] = None
    workflow: Optional[Dict[str, Any]] = None
    highlights: List[str] = Field(default_factory=list)
    hardest_challenge: Optional[str] = None


class AdditionalProject(BaseModel):
    title: str
    tagline: str
    description: str
    tech_stack: List[str]
    github_url: str
    # FIX #21: These were missing, so Pydantic silently stripped them from every
    # additional_projects entry on validation — the /api/profile "Data Inspector"
    # endpoint showed incomplete data even though the source JSON (and the LLM's
    # grounding context) had the full architecture/workflow detail all along.
    architecture: Optional[Dict[str, Any]] = None
    workflow: Optional[Dict[str, Any]] = None
    highlights: List[str] = Field(default_factory=list)
    hardest_challenge: Optional[str] = None


class ExperienceItem(BaseModel):
    role: str
    company: str
    location: str
    period: str
    responsibilities: List[str]
    achievements: str
    tech_used: List[str] = Field(default_factory=list)


class CertificationItem(BaseModel):
    name: str
    issuer: str
    date: str
    credential_url: str


class FAQAndInsights(BaseModel):
    why_hire_me: str
    hardest_technical_problem: str
    work_style: str
    career_goals: str
    technical_interests: Optional[str] = None


class CandidateProfile(BaseModel):
    personal_info: PersonalInfo
    education: List[EducationItem]
    skills: SkillsCatalog
    projects: List[ProjectItem]
    experience: List[ExperienceItem]
    certifications: List[CertificationItem]
    achievements: List[str]
    additional_projects: List[AdditionalProject] = Field(default_factory=list)
    faq_and_insights: FAQAndInsights


# ---------- Chat API Schemas ----------

class ChatMessage(BaseModel):
    role: str = Field(..., description="Message sender role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Chronological conversation history")


# ---------- Job Description Analysis Schemas ----------

class JDAnalysisRequest(BaseModel):
    job_description: str = Field(..., min_length=10, description="Full text of the Job Description")


class JDAnalysisResult(BaseModel):
    suitability_score: int = Field(..., ge=0, le=100, description="Suitability score percentage from 0 to 100")
    key_strengths: List[str] = Field(default_factory=list, description="Matching skills and domain overlap")
    missing_skills: List[str] = Field(default_factory=list, description="Required skills not present in candidate profile")
    interview_recommendation: str = Field(..., description="'Strong Hire', 'Interview Recommended', or 'Role Mismatch'")
    summary: str = Field(..., description="Executive summary evaluation")
