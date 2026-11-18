import tempfile
import unittest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.features.auth.models import User
from app.features.tasks.models import Task
from app.features.tasks.service import (
    TaskNotFoundError,
    create_task,
    delete_task,
    find_task,
    get_tasks,
    update_task_status,
)


class TestPersistence(unittest.TestCase):
    def setUp(self):
        # Create an isolated temporary SQLite database file
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_file = Path(self.temp_dir.name) / "test_isolated.db"
        self.db_url = f"sqlite:///{self.db_file.as_posix()}"

        # Initialize schema in the temporary database
        engine = create_engine(self.db_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)
        engine.dispose()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_persistence_across_independent_sessions(self):
        # --- App Lifetime 1: Create a user & task and commit ---
        engine1 = create_engine(self.db_url, connect_args={"check_same_thread": False})
        with Session(engine1) as session1:
            user = User(email="persist@example.com", password_hash="dummy-hash")
            session1.add(user)
            session1.commit()
            session1.refresh(user)
            user_id = user.id

            task = create_task(session1, title="Verify persistence task", owner_id=user_id)
            task_id = task.id
            self.assertIsNotNone(task_id)
            self.assertEqual(task.status, "TODO")
        engine1.dispose()

        # --- App Lifetime 2 (Simulating server restart): Read back task ---
        engine2 = create_engine(self.db_url, connect_args={"check_same_thread": False})
        with Session(engine2) as session2:
            fetched_task = find_task(session2, task_id, owner_id=user_id)
            self.assertEqual(fetched_task.id, task_id)
            self.assertEqual(fetched_task.title, "Verify persistence task")
            self.assertEqual(fetched_task.status, "TODO")

            # Update status to DONE
            update_task_status(session2, fetched_task, "DONE")
        engine2.dispose()

        # --- App Lifetime 3 (Second restart): Confirm status survived reload ---
        engine3 = create_engine(self.db_url, connect_args={"check_same_thread": False})
        with Session(engine3) as session3:
            fetched_task_again = find_task(session3, task_id, owner_id=user_id)
            self.assertEqual(fetched_task_again.status, "DONE")

            # Verify it shows up in get_tasks
            all_tasks = get_tasks(session3, owner_id=user_id)
            self.assertTrue(any(t.id == task_id for t in all_tasks))

            # Delete the task
            delete_task(session3, fetched_task_again)
        engine3.dispose()

        # --- App Lifetime 4 (Third restart): Confirm deletion persisted ---
        engine4 = create_engine(self.db_url, connect_args={"check_same_thread": False})
        with Session(engine4) as session4:
            with self.assertRaises(TaskNotFoundError):
                find_task(session4, task_id, owner_id=user_id)
        engine4.dispose()


if __name__ == "__main__":
    unittest.main()
