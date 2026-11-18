"""Persist rotating refresh sessions.

Revision ID: 79c213a14cf0
Revises: d9a372ef42b5
"""

import sqlalchemy as sa
from alembic import op


revision = "79c213a14cf0"
down_revision = "d9a372ef42b5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_refresh_sessions_user_id", table_name="refresh_sessions")
    op.drop_table("refresh_sessions")
