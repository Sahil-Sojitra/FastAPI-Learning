from sqlalchemy import inspect

from app.database import engine
from app.models import Task


def main():
    Task.metadata.create_all(engine)
    print("Tasks table exists:", inspect(engine).has_table("tasks"))


if __name__ == "__main__":
    main()