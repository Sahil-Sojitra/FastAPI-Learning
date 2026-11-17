from datetime import datetime
import pytest


@pytest.mark.parametrize(
    "params",
    [
        {"limit": 0},
        {"limit": 101},
        {"offset": -1},
        {"status": "DNOE"},
    ],
)
def test_reject_invalid_query_parameters(client, params):
    response = client.get("/tasks", params=params)

    assert response.status_code == 422



def test_create_and_read_task(client):
    response = client.post(
        "/tasks",
        json={"title": "Learn API testing"},
    )

    assert response.status_code == 201

    task = response.json()

    assert isinstance(task["id"], int)
    assert task["title"] == "Learn API testing"
    assert task["status"] == "TODO"
    assert task["created_at"] is not None

    # Check that the timestamp can be parsed.
    datetime.fromisoformat(task["created_at"])

    read_response = client.get(f"/tasks/{task['id']}")

    assert read_response.status_code == 200
    assert read_response.json() == task

def test_reject_short_title(client):
    response = client.post(
        "/tasks",
        json={"title": "Hi"},
    )

    assert response.status_code == 422

    # A rejected request must not create a task.
    list_response = client.get("/tasks")

    assert list_response.status_code == 200
    assert list_response.json() == []



def test_update_and_delete_task(client):
    # Create a task.
    created = client.post(
        "/tasks",
        json={"title": "Test task lifecycle"},
    )
    assert created.status_code == 201

    task = created.json()
    task_id = task["id"]

    # Update its status.
    updated = client.patch(
        f"/tasks/{task_id}",
        json={"status": "DONE"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "DONE"
    assert updated.json()["created_at"] == task["created_at"]

    # Confirm another request sees the update.
    fetched = client.get(f"/tasks/{task_id}")
    assert fetched.status_code == 200
    assert fetched.json()["status"] == "DONE"

    # Delete it.
    deleted = client.delete(f"/tasks/{task_id}")
    assert deleted.status_code == 204
    assert deleted.content == b""

    # Confirm it no longer exists.
    missing = client.get(f"/tasks/{task_id}")
    assert missing.status_code == 404


def test_pagination_and_status_filter(client):
    task_ids = []

    # Create four tasks in a known order.
    for title in ["First task", "Second task", "Third task", "Fourth task"]:
        response = client.post("/tasks", json={"title": title})
        assert response.status_code == 201
        task_ids.append(response.json()["id"])

    # Mark the second and fourth tasks as DONE.
    for task_id in [task_ids[1], task_ids[3]]:
        response = client.patch(
            f"/tasks/{task_id}",
            json={"status": "DONE"},
        )
        assert response.status_code == 200

    # First page: first two tasks.
    first_page = client.get(
        "/tasks",
        params={"limit": 2, "offset": 0},
    )
    assert first_page.status_code == 200
    assert [task["id"] for task in first_page.json()] == task_ids[:2]

    # Second page: next two tasks.
    second_page = client.get(
        "/tasks",
        params={"limit": 2, "offset": 2},
    )
    assert second_page.status_code == 200
    assert [task["id"] for task in second_page.json()] == task_ids[2:]

    # Filter first, then skip the first matching task.
    filtered = client.get(
        "/tasks",
        params={"status": "DONE", "limit": 1, "offset": 1},
    )
    assert filtered.status_code == 200

    tasks = filtered.json()
    assert len(tasks) == 1
    assert tasks[0]["id"] == task_ids[3]
    assert tasks[0]["status"] == "DONE"

    # Skipping beyond the available rows returns an empty list.
    beyond_end = client.get("/tasks", params={"offset": 100})
    assert beyond_end.status_code == 200
    assert beyond_end.json() == []