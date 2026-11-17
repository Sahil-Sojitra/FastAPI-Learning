from collections.abc import Iterator
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session

# Anchor database to project root (parent directory of app/)
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "task_board.db"
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"


class Base(DeclarativeBase):
    pass


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


def get_db() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
