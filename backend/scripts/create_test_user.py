
import sys
import os

# Add the app directory to the path so we can import the modules
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.repositories.user_repo import UserRepository
from app.repositories.candidate_repo import CandidateRepository
from app.db.models.user import User

def create_candidate_user():
    db: Session = SessionLocal()
    user_repo = UserRepository(db)
    cand_repo = CandidateRepository(db)

    email = "candidate@paths.ai"
    full_name = "Candidate User"
    password = "Candidate123!"

    print(f"Checking if user {email} exists...")
    existing_user = user_repo.get_by_email(email)
    if existing_user:
        print(f"User {email} already exists. Updating password...")
        from app.core.security import get_password_hash
        existing_user.hashed_password = get_password_hash(password)
        db.commit()
        print("Password updated successfully.")
        return

    print(f"Creating user {email}...")
    user = user_repo.create_user(
        email=email,
        full_name=full_name,
        plain_password=password,
        account_type="candidate",
    )

    print(f"Creating candidate profile for {full_name}...")
    cand_repo.create_profile(
        user_id=user.id,
        full_name=full_name,
        email=email,
        headline="Experienced Professional looking for new opportunities",
        location="San Francisco, CA"
    )

    db.commit()
    print(f"Successfully created candidate user: {email} / {password}")

if __name__ == "__main__":
    create_candidate_user()
