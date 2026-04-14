"""add outreach_messages and interview_sessions tables

Revision ID: f1a2b3c4d5e6
Revises: 80a2c3cb4e2f
Create Date: 2026-04-12 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = '80a2c3cb4e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'outreach_messages',
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='email'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='queued'),
        sa.Column('message_subject', sa.String(length=255), nullable=True),
        sa.Column('message_body', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_outreach_messages_candidate_id', 'outreach_messages', ['candidate_id'])
    op.create_index('ix_outreach_messages_job_id', 'outreach_messages', ['job_id'])

    op.create_table(
        'interview_sessions',
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('interview_type', sa.String(length=50), nullable=False, server_default='screening'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='scheduled'),
        sa.Column('scheduled_date', sa.String(length=20), nullable=False),
        sa.Column('scheduled_time', sa.String(length=20), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('meeting_link', sa.String(length=500), nullable=True),
        sa.Column('interviewers_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_interview_sessions_candidate_id', 'interview_sessions', ['candidate_id'])
    op.create_index('ix_interview_sessions_job_id', 'interview_sessions', ['job_id'])


def downgrade() -> None:
    op.drop_index('ix_interview_sessions_job_id', table_name='interview_sessions')
    op.drop_index('ix_interview_sessions_candidate_id', table_name='interview_sessions')
    op.drop_table('interview_sessions')
    op.drop_index('ix_outreach_messages_job_id', table_name='outreach_messages')
    op.drop_index('ix_outreach_messages_candidate_id', table_name='outreach_messages')
    op.drop_table('outreach_messages')
