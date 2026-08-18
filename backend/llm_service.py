"""
LLM Service handling Groq API integration, streaming generation, and mock fallbacks.
"""

import os
import re  # FIX #15: was imported inside hot-path function body
import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any
from schemas import ChatMessage, JDAnalysisResult
from prompts import build_system_persona_prompt, build_jd_analysis_prompt

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


# FIX #3: Use the constant everywhere — no more redundant os.getenv() inside functions
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
DEFAULT_MODEL = os.getenv("MODEL_NAME", "openai/gpt-oss-120b")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# FIX #12: Sliding window — only send last N turns to avoid hitting context limits
MAX_HISTORY_TURNS = 10


async def stream_chat_response(
    messages: List[ChatMessage],
    profile_dict: dict
) -> AsyncGenerator[str, None]:
    """
    Streams chat completion tokens from Groq API or fallback mock generator.
    """
    # FIX #22: Embedding the full profile JSON (all projects' architecture/workflow/
    # highlights) in every system prompt blew past Groq's free-tier 8000 TPM limit as
    # soon as the project catalog grew — a single request needed 10,620 tokens and got
    # a silent 413. Only the specifically-asked-about project (if any) gets full detail;
    # every other project is condensed to title/tagline/description/tech_stack.
    last_user_msg = messages[-1].content if messages else ""
    context_profile = _build_context_profile(profile_dict, last_user_msg)
    system_prompt = build_system_persona_prompt(context_profile)

    # FIX #12: Trim history to last MAX_HISTORY_TURNS to prevent context overflow
    trimmed_messages = messages[-MAX_HISTORY_TURNS:]

    # Formulate full payload messages
    payload_messages = [{"role": "system", "content": system_prompt}]
    for msg in trimmed_messages:
        payload_messages.append({"role": msg.role, "content": msg.content})

    # FIX #3: Use module-level constant instead of re-reading env var
    if GROQ_API_KEY and HTTPX_AVAILABLE:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        body = {
            "model": DEFAULT_MODEL,
            "messages": payload_messages,
            "temperature": 0.3,
            "max_tokens": 1024,
            "stream": True
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("POST", GROQ_API_URL, headers=headers, json=body) as response:
                    if response.status_code == 200:
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_str)
                                    delta = chunk["choices"][0]["delta"].get("content", "")
                                    if delta:
                                        yield delta
                                except Exception:
                                    continue
                        return
                    else:
                        error_detail = await response.aread()
                        print(f"Groq API Error ({response.status_code}): {error_detail.decode('utf-8')}")
        except Exception as e:
            print(f"Streaming connection error: {e}")

    # Fallback Streaming Response (for local testing without GROQ_API_KEY)
    last_user_msg = messages[-1].content.lower() if messages else ""
    fallback_reply = _generate_fallback_reply(last_user_msg, profile_dict)

    # Simulate typing delay for realistic streaming fallback
    words = fallback_reply.split(" ")
    for idx, word in enumerate(words):
        yield word + (" " if idx < len(words) - 1 else "")
        await asyncio.sleep(0.04)


async def analyze_job_description(
    job_description: str,
    profile_dict: dict
) -> JDAnalysisResult:
    """
    Analyzes candidate fit against a Job Description using Groq LLM or heuristic fallback.
    """
    # FIX #22: JD matching only needs tech_stack/description per project, not full
    # architecture/workflow prose — condense all projects to keep this under Groq's TPM limit.
    context_profile = dict(profile_dict)
    for key in ("projects", "additional_projects"):
        context_profile[key] = [_condensed_project(p) for p in profile_dict.get(key, [])]

    system_prompt = build_jd_analysis_prompt(context_profile, job_description)

    # FIX #3: Use module-level constant
    if GROQ_API_KEY and HTTPX_AVAILABLE:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        body = {
            "model": DEFAULT_MODEL,
            "messages": [
                {"role": "system", "content": "You are a JSON-only response engine."},
                {"role": "user", "content": system_prompt}
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(GROQ_API_URL, headers=headers, json=body)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(raw_content)
                    return JDAnalysisResult(**parsed)
        except Exception as e:
            print(f"JD Analysis API error: {e}")

    # Heuristic fallback analysis if API key is not present
    return _generate_fallback_jd_analysis(job_description, profile_dict)


def _get_ranked_projects(profile: dict) -> list:
    """
    FIX #18: Returns ranked projects dynamically instead of relying on hardcoded
    array indices. Ranks by: has live_url > has architecture > default order.
    """
    projects = profile.get("projects", [])
    def rank_key(p):
        has_live = 1 if p.get("live_url", "").startswith("http") else 0
        has_arch = 1 if p.get("architecture") else 0
        return -(has_live * 2 + has_arch)
    return sorted(projects, key=rank_key)


# FIX #19: Generic words that appear in many project titles but aren't distinctive
# enough to use as a name-match signal (would false-positive on unrelated questions).
_TITLE_STOPWORDS = {
    "the", "and", "for", "with", "full", "stack", "system", "systems",
    "platform", "engine", "dashboard", "detection", "management",
    "scheduling", "based", "app", "application", "tool", "project",
    "service", "station", "stations", "web", "real", "time", "message",
    "data", "code",
}
# Short tokens that are otherwise filtered by length but are meaningful project identifiers.
_TITLE_KEYWORD_ALLOWLIST = {"ev"}


def _title_keywords(title: str) -> set:
    """Extracts distinctive identifier words from a project title (e.g. 'Sentinel-K8s' -> {'sentinel', 'k8s'})."""
    words = re.split(r'[^a-z0-9]+', title.lower())
    return {
        w for w in words
        if w and (len(w) >= 3 or w in _TITLE_KEYWORD_ALLOWLIST) and w not in _TITLE_STOPWORDS
    }


def _find_mentioned_project(user_msg_lower: str, profile: dict) -> dict | None:
    """
    FIX #19: Matches a user message against ALL project titles dynamically (main +
    additional), instead of a hardcoded keyword list that silently misses any project
    added after the list was written. Returns the best-matching project, or None.
    """
    all_projects = profile.get("projects", []) + profile.get("additional_projects", [])
    best, best_score = None, 0
    for p in all_projects:
        kws = _title_keywords(p.get("title", ""))
        hits = sum(1 for kw in kws if re.search(rf'\b{re.escape(kw)}\b', user_msg_lower))
        if hits > best_score:
            best, best_score = p, hits
    return best


def _format_project_detail(p: dict) -> str:
    """Renders a full detail card for a single project — description, tech stack, architecture, workflow, highlights."""
    lines = [f"## {p['title']} — {p.get('tagline', '')}\n"]
    lines.append(f"{p.get('description', '')}\n")

    tech = p.get("tech_stack", [])
    if tech:
        lines.append(f"**Tech Stack**: {', '.join(tech)}\n")

    arch = p.get("architecture", {})
    if arch:
        lines.append(f"**Architecture Type**: {arch.get('type', 'N/A')}\n")
        for key, val in arch.items():
            if key != "type":
                lines.append(f"- **{key.replace('_', ' ').title()}**: {val}")

    wf = p.get("workflow", {})
    if wf:
        lines.append("\n**Key Workflows**:")
        for key, val in wf.items():
            lines.append(f"- **{key.replace('_', ' ').title()}**: {val}")

    highlights = p.get("highlights", [])
    if highlights:
        lines.append("\n**Highlights**:")
        for h in highlights:
            lines.append(f"- {h}")

    if p.get("hardest_challenge"):
        lines.append(f"\n**Hardest Challenge**: {p['hardest_challenge']}")

    if p.get("github_url"):
        lines.append(f"\n🔗 GitHub: {p['github_url']}")
    if p.get("live_url"):
        lines.append(f"🌐 Live: {p['live_url']}")

    return "\n".join(lines)


def _condensed_project(p: dict) -> dict:
    """Strips a project down to what's needed for listing/ranking questions — no
    architecture/workflow/highlights prose, which is what actually blows up token count."""
    condensed = {
        "title": p.get("title"),
        "tagline": p.get("tagline"),
        "description": p.get("description"),
        "tech_stack": p.get("tech_stack", []),
        "github_url": p.get("github_url"),
    }
    if p.get("live_url"):
        condensed["live_url"] = p["live_url"]
    return condensed


def _build_context_profile(profile_dict: dict, last_user_msg: str) -> dict:
    """
    FIX #22: Builds the profile dict actually sent to the LLM. Every project is condensed
    (title/tagline/description/tech_stack only) EXCEPT the one the user's latest message
    names, if any — that one keeps its full architecture/workflow/highlights detail. Keeps
    the system prompt's size roughly constant as the project catalog grows, instead of
    scaling linearly with every project ever added.
    """
    mentioned = _find_mentioned_project(last_user_msg.lower(), profile_dict)
    mentioned_title = mentioned.get("title") if mentioned else None

    context = dict(profile_dict)
    for key in ("projects", "additional_projects"):
        context[key] = [
            p if p.get("title") == mentioned_title else _condensed_project(p)
            for p in profile_dict.get(key, [])
        ]
    return context

    return "\n".join(lines)


def _generate_fallback_reply(user_msg: str, profile: dict) -> str:
    """Generates intelligent grounded response for offline/mock mode using rich GitHub data."""
    p_info = profile.get("personal_info", {})
    name = p_info.get("name", "Nishant")
    title = p_info.get("title", "Software Engineer")
    user_msg_lower = user_msg.lower()

    projects = profile.get("projects", [])

    # FIX #19: Specific-project mention (by name) takes priority over every other
    # branch below — works regardless of phrasing ("tell me about X", "how does X work",
    # "what is X"), and always returns the full architecture/workflow detail card.
    mentioned_project = _find_mentioned_project(user_msg_lower, profile)
    if mentioned_project:
        return _format_project_detail(mentioned_project)

    # Architecture / System Design questions (no specific project named — generic overview)
    if any(k in user_msg_lower for k in ["architect", "system design", "workflow", "how does", "how did", "how it works", "flow", "pipeline"]):
        # Generic architecture overview
        lines = ["Here's a quick architectural overview of each of my key projects:\n"]
        for p in projects[:4]:
            arch = p.get("architecture", {})
            proj_lines = [f"### {p['title']}\n- **Type**: {arch.get('type', 'Not specified')}"]
            frontend = arch.get("frontend", "")
            backend = arch.get("backend", "")
            if frontend and frontend.strip():
                proj_lines.append(f"- **Frontend**: {frontend}")
            if backend and backend.strip():
                proj_lines.append(f"- **Backend**: {backend}")
            lines.append("\n".join(proj_lines) + "\n")
        lines.append("Ask me to dive deeper into any specific project's architecture!")
        return "\n".join(lines)

    # "Top N" or specific count project request
    top_n_match = re.search(r'top\s*(\d+)|best\s*(\d+)|(\d+)\s*(?:best|top|main|key)\s*project', user_msg_lower)
    is_top_n_request = top_n_match is not None
    requested_n = None
    if top_n_match:
        num_str = top_n_match.group(1) or top_n_match.group(2) or top_n_match.group(3)
        requested_n = int(num_str) if num_str else None

    # Project listing question — specific-project names are already handled above by
    # _find_mentioned_project, so only generic "show me everything" phrasing lands here.
    if is_top_n_request or any(k in user_msg_lower for k in ["project", "projects", "portfolio", "built", "worked on", "show me"]):
        # FIX #18: Use dynamic ranking instead of hardcoded indices
        ranked_projects = _get_ranked_projects(profile)

        if is_top_n_request and requested_n:
            n = min(requested_n, len(ranked_projects))
            lines = [f"Here are my **top {n} most impactful projects**:\n"]
            for idx, p in enumerate(ranked_projects[:n], 1):
                highlights = p.get("highlights", [])
                arch = p.get("architecture", {})
                lines.append(
                    f"### {idx}. {p['title']}\n"
                    f"*{p['tagline']}*\n\n"
                    f"**Tech Stack**: {', '.join(p['tech_stack'][:6])}\n\n"
                    f"**What it is**: {p['description']}\n"
                )
                if highlights:
                    lines.append(f"**Key Achievement**: {highlights[0]}\n")
                if arch.get("deployment"):
                    lines.append(f"**Deployed**: {arch['deployment']}\n")
                lines.append(f"🔗 GitHub: {p['github_url']}\n")
                if p.get("live_url"):
                    lines.append(f"🌐 Live: {p['live_url']}\n")
                lines.append("---")
            lines.append("\nWant me to deep-dive into the architecture or workflow of any of these?")
            return "\n".join(lines)

        # Full listing — all projects
        all_projects = ranked_projects + profile.get("additional_projects", [])
        lines = [f"I have built **{len(all_projects)} projects** across full-stack, AI, ML, and systems domains:\n"]
        lines.append("**🏆 Main Projects (Production / Deployed):**")
        for idx, p in enumerate(ranked_projects, 1):
            lines.append(
                f"{idx}. **{p['title']}** — *{p['tagline']}*\n"
                f"   - **Stack**: {', '.join(p['tech_stack'][:5])}{'...' if len(p['tech_stack']) > 5 else ''}\n"
                f"   - {p['description'][:180]}\n"
            )
        lines.append("\n**⚙️ Additional Projects:**")
        for idx, p in enumerate(profile.get("additional_projects", []), len(ranked_projects) + 1):
            lines.append(
                f"{idx}. **{p['title']}** — *{p['tagline']}*\n"
                f"   - **Stack**: {', '.join(p.get('tech_stack', [])[:4])}\n"
                f"   - {p['description'][:150]}\n"
            )
        lines.append("\nAsk me about architecture, workflow, or challenges for any specific project!")
        return "\n".join(lines)

    # Hardest challenge — checked BEFORE skills to prevent misrouting
    if any(k in user_msg_lower for k in ["hardest", "challenge", "difficult", "toughest", "problem solved"]):
        hard = profile.get("faq_and_insights", {}).get("hardest_technical_problem", "")
        return f"**My Hardest Technical Challenge:**\n\n{hard}"

    # Skills question — generic "do you know X" phrasing is matched without hardcoding
    # every possible skill/language name, so this doesn't go stale as the skill list grows.
    if any(k in user_msg_lower for k in ["skill", "tech stack", "tech", "python", "react", "node", "typescript", "language", "framework", "do you know", "have you worked with", "familiar with", "experience with", "proficient"]):
        skills = profile.get("skills", {})
        langs = ", ".join(skills.get("languages", []))
        fw = ", ".join(skills.get("frameworks_and_libraries", []))
        ai = ", ".join(skills.get("ai_and_llm", []))
        db = ", ".join(skills.get("databases", []))
        devops = ", ".join(skills.get("cloud_and_devops", []))
        security = ", ".join(skills.get("security_and_testing", []))
        tools = ", ".join(skills.get("payments_and_tools", []))
        return (
            f"## My Technical Skills\n\n"
            f"- **Languages**: {langs}\n"
            f"- **Frameworks & Libraries**: {fw}\n"
            f"- **AI & LLM**: {ai}\n"
            f"- **Databases**: {db}\n"
            f"- **Cloud & DevOps**: {devops}\n"
            f"- **Security & Testing**: {security}\n"
            + (f"- **Payments, Media & Tools**: {tools}\n" if tools else "")
            + f"\nI focus on production-grade, secure, and testable code."
        )

    # Why hire / strengths
    if any(k in user_msg_lower for k in ["hire", "why", "suitable", "strength"]):
        why = profile.get("faq_and_insights", {}).get("why_hire_me", "")
        return f"**Why hire me?**\n\n{why}"

    # Experience / internship
    if any(k in user_msg_lower for k in ["experience", "intern", "work", "job", "company"]):
        exp_list = profile.get("experience", [])
        if exp_list:
            exp = exp_list[0]
            resp = "\n".join([f"  - {r}" for r in exp.get("responsibilities", [])])
            return (
                f"## Work Experience\n\n"
                f"**{exp['role']}** @ **{exp['company']}** ({exp['period']})\n"
                f"_{exp['location']}_\n\n"
                f"**Key Contributions**:\n{resp}\n\n"
                f"**Achievement**: {exp['achievements']}\n\n"
                f"**Technologies Used**: {', '.join(exp.get('tech_used', []))}"
            )

    # Certification question (checked before education so cert-specific asks get a focused answer)
    if any(k in user_msg_lower for k in ["certification", "certificate", "cert"]):
        certs = profile.get("certifications", [])
        if certs:
            lines = ["## Certifications\n"]
            for c in certs:
                lines.append(f"**{c.get('name')}** — {c.get('issuer')} ({c.get('date')})")
            return "\n".join(lines)

    # Education question
    if any(k in user_msg_lower for k in ["education", "degree", "cgpa", "sgpa", "university", "college"]):
        edu = profile.get("education", [{}])[0]
        return (
            f"## Education\n\n"
            f"**{edu.get('degree')}**\n"
            f"_{edu.get('institution')}_, {edu.get('location')} ({edu.get('period')})\n"
            f"**{edu.get('cgpa')}**\n\n"
            f"**Relevant Coursework**: {', '.join(edu.get('coursework', []))}"
        )

    # General greeting / default
    total_projects = len(projects) + len(profile.get("additional_projects", []))
    return (
        f"Hello! I'm the AI Representative for **{name}** — *{title}*.\n\n"
        f"{p_info.get('bio', '')}\n\n"
        f"You can ask me about:\n"
        f"- 🏗️ **Project Architecture & Workflows** — {total_projects} projects total\n"
        f"- 🛠️ **Technical Skills & Stack**\n"
        f"- 💼 **Work Experience & Internship**\n"
        f"- 🎓 **Education & Certifications**\n"
        f"- 🏆 **Achievements & Hackathons**\n"
        f"- 📋 **Paste a Job Description** to get a Suitability Score!"
    )


def _skill_aliases(skill: str) -> list:
    """
    FIX #20: Breaks a compound skill string like 'AWS (EC2, S3)' or 'JWT Authentication'
    into matchable tokens ('aws', 'ec2', 's3' / 'jwt authentication', 'jwt'), so a JD
    that just says "AWS" or "JWT" still counts as a match instead of requiring the
    exact compound string to appear verbatim.
    """
    skill_lower = skill.lower().strip()
    aliases = {skill_lower}

    paren_match = re.match(r'^([^(]+)\(([^)]+)\)\s*$', skill_lower)
    if paren_match:
        main, inner = paren_match.group(1).strip(), paren_match.group(2)
        aliases.add(main)
        for part in re.split(r'[,/]', inner):
            part = part.strip()
            if part:
                aliases.add(part)

    words = skill_lower.split()
    if len(words) > 1:
        aliases.add(words[0])

    return [a for a in aliases if len(a) > 1]


def _alias_in_text(alias: str, text: str) -> bool:
    """Whole-word match for single tokens (avoids 'java' matching inside 'javascript'); substring for phrases."""
    if " " in alias or "-" in alias:
        return alias in text
    return re.search(rf'\b{re.escape(alias)}\b', text) is not None


def _generate_fallback_jd_analysis(jd_text: str, profile: dict) -> JDAnalysisResult:
    """
    FIX #20: Score is now based on absolute matched-skill count with a diminishing-returns
    curve, not "matches / entire 50+ item skill inventory" — the old formula meant even a
    JD that matched most of a role's real requirements (6-8 skills) could never break ~35%,
    because no real JD name-drops a candidate's full skill list. Combined with compound-string
    matching (FIX above), a strong-fit JD now scores as a strong fit instead of "Role Mismatch".
    """
    jd_lower = jd_text.lower()

    skills = profile.get("skills", {})
    all_candidate_skills = []
    for cat in skills.values():
        all_candidate_skills.extend(cat)

    unique_matches = []
    covered_aliases = set()
    for skill in all_candidate_skills:
        aliases = _skill_aliases(skill)
        covered_aliases.update(aliases)
        if any(_alias_in_text(a, jd_lower) for a in aliases):
            unique_matches.append(skill)

    match_count = len(unique_matches)
    # Diminishing-returns curve: 0 matches -> floor of 15; each match adds meaningfully;
    # caps at 95 (never claim a "perfect" match from a keyword heuristic alone).
    score = 15 if match_count == 0 else min(95, 40 + match_count * 7)

    def _phrase_strength(skill: str) -> str:
        # Skills explicitly tagged as still-developing (e.g. "Redis (Exploring)") shouldn't
        # be claimed as "strong proficiency" — that would contradict the candidate's own caveat.
        if "exploring" in skill.lower():
            clean = re.sub(r'\s*\(exploring\)', '', skill, flags=re.IGNORECASE).strip()
            return f"Hands-on familiarity with {clean} (actively deepening expertise)"
        return f"Strong proficiency in {skill}"

    key_strengths = (
        [_phrase_strength(s) for s in unique_matches[:5]]
        or ["Solid foundation in Python & React development", "Experience with FastAPI and API design"]
    )

    # Only report missing skills that are actually mentioned in the JD and not already
    # covered (directly or via alias) by the candidate's real skill list.
    common_enterprise_skills = ["kubernetes", "graphql", "terraform", "azure", "docker swarm", "kafka", "redis", "grpc"]
    missing_skills = [
        s.title() for s in common_enterprise_skills
        if _alias_in_text(s, jd_lower) and s not in covered_aliases
    ]
    if not missing_skills:
        missing_skills = ["No significant gaps identified for this role"]

    recommendation = "Strong Hire" if score >= 80 else ("Interview Recommended" if score >= 50 else "Role Mismatch")

    return JDAnalysisResult(
        suitability_score=score,
        key_strengths=key_strengths,
        missing_skills=missing_skills,
        interview_recommendation=recommendation,
        summary=(
            f"The candidate's technical profile shows a {score}% keyword match with the job requirements. "
            f"{match_count} matching skills were identified. "
            f"{'Strong alignment — recommend proceeding to interview.' if score >= 70 else 'Partial alignment — evaluation recommended for role-specific fit.'}"
        )
    )
