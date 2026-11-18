from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="TODO", nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(),
        nullable=True,
    )
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_tasks_owner_id_users"),
        nullable=True,
        index=True,
    )
