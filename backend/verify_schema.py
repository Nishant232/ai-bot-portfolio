"""
Senior Check Script: Validates candidate_profile.json against Pydantic schema.
"""

import json
from pathlib import Path
from schemas import CandidateProfile

def main():
    profile_path = Path(__file__).parent / "data" / "candidate_profile.json"
    print(f"Checking candidate profile at: {profile_path}")

    with open(profile_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    # Validate using Pydantic
    profile = CandidateProfile(**raw_data)
    
    print("✅ Senior Check Passed: candidate_profile.json strictly conforms to CandidateProfile schema!")
    print(f"Candidate Name: {profile.personal_info.name}")
    print(f"Projects Count: {len(profile.projects)}")
    print(f"Skills Languages: {', '.join(profile.skills.languages)}")

if __name__ == "__main__":
    main()
