"""add assessment_sessions table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-14 12:00:00.000000

Stores technical/domain assessment sessions for candidate/job pairs.
Questions are generated from job skill requirements; answers are submitted
and scored by the Technical Assessment Agent.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'assessment_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('assessment_type', sa.String(length=50), nullable=False, server_default='technical'),
        sa.Column('questions_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('answers_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('question_scores_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('overall_score', sa.Integer(), nullable=True),
        sa.Column('result', sa.String(length=50), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('strengths', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('gaps', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id']),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_assessment_sessions_candidate_id', 'assessment_sessions', ['candidate_id'])
    op.create_index('ix_assessment_sessions_job_id', 'assessment_sessions', ['job_id'])


def downgrade() -> None:
    op.drop_index('ix_assessment_sessions_job_id', table_name='assessment_sessions')
    op.drop_index('ix_assessment_sessions_candidate_id', table_name='assessment_sessions')
    op.drop_table('assessment_sessions')
