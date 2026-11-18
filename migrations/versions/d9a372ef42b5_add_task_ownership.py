"""add task ownership

Revision ID: d9a372ef42b5
Revises: 742a87197c98
Create Date: 2026-11-18 10:39:18.194583

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9a372ef42b5'
down_revision: Union[str, Sequence[str], None] = '742a87197c98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.add_column(
            sa.Column("owner_id", sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_tasks_owner_id_users",
            "users",
            ["owner_id"],
            ["id"],
        )
        batch_op.create_index(
            "ix_tasks_owner_id",
            ["owner_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.drop_index("ix_tasks_owner_id")
        batch_op.drop_constraint(
            "fk_tasks_owner_id_users",
            type_="foreignkey",
        )
        batch_op.drop_column("owner_id")
