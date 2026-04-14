"""
PATHS Backend — Jobs API endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.db.models.job import Job
from app.db.models.application import Application
from app.db.models.candidate import Candidate

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/")
def list_jobs(
    status: str | None = Query(None, description="Filter by status: draft, published, closed"),
    limit: int = Query(50, ge=1, le=100, description="Max results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
):
    """
    List active jobs with optional status filter and pagination.
    Results are ordered newest first.
    """
    filters = [Job.is_active == True]  # noqa: E712
    if status:
        filters.append(Job.status == status.lower())

    total: int = db.scalar(select(func.count(Job.id)).where(*filters)) or 0

    jobs = db.execute(
        select(Job)
        .where(*filters)
        .order_by(Job.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    items = [
        {
            "id": str(j.id),
            "title": j.title,
            "company_name": j.company_name,
            "department": j.department,
            "status": j.status,
            "employment_type": j.employment_type,
            "location_text": j.location_text,
            "location_mode": j.location_mode,
            "source_type": j.source_type,
            "description_text": j.description_text,
            "candidates_count": len(j.applications),
            "posted_at": j.posted_at.isoformat() if j.posted_at else None,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{job_id}")
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    """Retrieve a single active job by its UUID."""
    job = db.get(Job, job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "id": str(job.id),
        "title": job.title,
        "company_name": job.company_name,
        "department": job.department,
        "status": job.status,
        "employment_type": job.employment_type,
        "location_text": job.location_text,
        "location_mode": job.location_mode,
        "source_type": job.source_type,
        "description_text": job.description_text,
        "requirements": job.requirements,
        "seniority_level": job.seniority_level,
        "experience_level": job.experience_level,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_currency": job.salary_currency,
        "source_url": job.source_url,
        "candidates_count": len(job.applications),
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "created_at": job.created_at.isoformat(),
    }


@router.get("/{job_id}/candidates")
def list_job_candidates(
    job_id: UUID,
    db: Session = Depends(get_db),
):
    """
    List all candidates who have an application for this job.
    Used by the outreach page to populate the candidate list.
    """
    job = db.get(Job, job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")

    applications = db.execute(
        select(Application, Candidate)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .where(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
    ).all()

    return {
        "job_id": str(job_id),
        "items": [
            {
                "candidate_id": str(row.Candidate.id),
                "full_name": row.Candidate.full_name,
                "email": row.Candidate.email,
                "current_title": row.Candidate.current_title,
                "location_text": row.Candidate.location_text,
                "stage_code": row.Application.current_stage_code,
                "application_id": str(row.Application.id),
            }
            for row in applications
        ],
        "total": len(applications),
    }
