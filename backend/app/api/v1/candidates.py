import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.database import get_db
from app.db.models.candidate import Candidate
from app.db.models.cv_entities import CandidateSkill, CandidateExperience, CandidateEducation, CandidateCertification

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.get("/")
def list_candidates(
    limit: int = Query(50, ge=1, le=100, description="Max results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
):
    """
    List active candidates with pagination.
    Includes first application's job_id and stage_code when available.
    Results are ordered newest first.
    """
    filters = [Candidate.status == "active"]

    total: int = db.scalar(select(func.count(Candidate.id)).where(*filters)) or 0

    candidates = db.execute(
        select(Candidate)
        .where(*filters)
        .order_by(Candidate.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    items = []
    for c in candidates:
        # applications is lazy="selectin" — already loaded, no extra query per row
        first_app = c.applications[0] if c.applications else None
        items.append({
            "id": str(c.id),
            "full_name": c.full_name,
            "email": c.email,
            "phone": c.phone,
            "current_title": c.current_title,
            "years_experience": c.years_experience,
            "location_text": c.location_text,
            "status": c.status,
            "job_id": str(first_app.job_id) if first_app else None,
            "stage_code": first_app.current_stage_code if first_app else "applied",
            "created_at": c.created_at.isoformat(),
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{candidate_id}")
async def get_candidate(candidate_id: str, anonymize: bool = False, db: Session = Depends(get_db)):
    try:
        cand_uuid = uuid.UUID(candidate_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid candidate_id UUID")

    cand = db.get(Candidate, cand_uuid)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    skills = db.execute(select(CandidateSkill).where(CandidateSkill.candidate_id == cand_uuid)).scalars().all()
    experiences = db.execute(select(CandidateExperience).where(CandidateExperience.candidate_id == cand_uuid)).scalars().all()
    education = db.execute(select(CandidateEducation).where(CandidateEducation.candidate_id == cand_uuid)).scalars().all()
    certifications = db.execute(select(CandidateCertification).where(CandidateCertification.candidate_id == cand_uuid)).scalars().all()

    import hashlib
    # Simple Hash to generate a consistent anonymized string
    anon_hash = hashlib.md5(candidate_id.encode()).hexdigest()[:6].upper()

    return {
        "candidate": {
            "id": str(cand.id),
            "full_name": cand.full_name if not anonymize else f"Candidate #{anon_hash}",
            "email": cand.email if not anonymize else "***@anonymized.hidden",
            "phone": cand.phone if not anonymize else "+* (***) ***-****",
            "location_text": cand.location_text,
            "summary": cand.summary,
            "years_experience": cand.years_experience
        },
        "skills": [{"skill_id": str(s.skill_id), "score": s.proficiency_score} for s in skills],
        "experiences": [{"company": e.company_name if not anonymize else "Confidential Org", "title": e.title} for e in experiences],
        "education": [{"institution": e.institution if not anonymize else "Confidential Edu", "degree": e.degree} for e in education],
        "certifications": [{"name": c.name, "issuer": c.issuer} for c in certifications]
    }
