import pytest
from fastapi.testclient import TestClient
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import Session

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def client(tmp_path):
    test_engine = create_engine(
        URL.create(
            "sqlite",
            database=str(tmp_path / "test.db"),
        ),
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(test_engine)

    def override_get_db():
        with Session(test_engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        test_engine.dispose()