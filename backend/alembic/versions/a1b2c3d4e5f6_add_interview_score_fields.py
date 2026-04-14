"""add interview score and feedback fields

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-04-14 10:00:00.000000

Adds post-interview evaluation fields to interview_sessions.
These are populated by the HR Interview Agent, Technical Interview Agent,
or directly by a recruiter via the score endpoint.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'interview_sessions',
        sa.Column('overall_score', sa.Integer(), nullable=True),
    )
    op.add_column(
        'interview_sessions',
        sa.Column('dimension_scores', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        'interview_sessions',
        sa.Column('feedback_text', sa.Text(), nullable=True),
    )
    op.add_column(
        'interview_sessions',
        sa.Column('strengths', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        'interview_sessions',
        sa.Column('concerns', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        'interview_sessions',
        sa.Column('recommendation', sa.String(length=50), nullable=True),
    )
    op.add_column(
        'interview_sessions',
        sa.Column('scored_by', sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('interview_sessions', 'scored_by')
    op.drop_column('interview_sessions', 'recommendation')
    op.drop_column('interview_sessions', 'concerns')
    op.drop_column('interview_sessions', 'strengths')
    op.drop_column('interview_sessions', 'feedback_text')
    op.drop_column('interview_sessions', 'dimension_scores')
    op.drop_column('interview_sessions', 'overall_score')
