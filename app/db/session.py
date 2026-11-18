from collections.abc import Iterator
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlite3 import Connection as SQLiteConnection

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)


@event.listens_for(Engine, "connect")
def enable_sqlite_foreign_keys(connection, connection_record):
    if not isinstance(connection, SQLiteConnection):
        return

    previous_autocommit = connection.autocommit
    connection.autocommit = True

    try:
        cursor = connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        finally:
            cursor.close()
    finally:
        connection.autocommit = previous_autocommit


def get_db() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
