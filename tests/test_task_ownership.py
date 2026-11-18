def register_and_login(client, email):
    credentials = {
        "email": email,
        "password": "Learning-FastAPI-2026!",
    }

    registered = client.post("/auth/register", json=credentials)
    assert registered.status_code == 201

    login = client.post("/auth/login", json=credentials)
    assert login.status_code == 200

    return {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }


def test_users_cannot_access_each_others_tasks(client):
    alice = register_and_login(client, "alice@example.com")
    bob = register_and_login(client, "bob@example.com")

    created = client.post(
        "/tasks",
        headers=alice,
        json={"title": "Alice private task"},
    )
    assert created.status_code == 201
    task_id = created.json()["id"]

    # Bob's list excludes Alice's task.
    bob_tasks = client.get("/tasks", headers=bob)
    assert bob_tasks.status_code == 200
    assert bob_tasks.json() == []

    # Bob cannot read, update or delete it.
    assert client.get(
        f"/tasks/{task_id}", headers=bob
    ).status_code == 404

    assert client.patch(
        f"/tasks/{task_id}",
        headers=bob,
        json={"status": "DONE"},
    ).status_code == 404

    assert client.delete(
        f"/tasks/{task_id}", headers=bob
    ).status_code == 404

    # Alice's task remains intact.
    fetched = client.get(f"/tasks/{task_id}", headers=alice)
    assert fetched.status_code == 200
    assert fetched.json()["status"] == "TODO"

    # Bob's new task is visible to Bob, not Alice.
    bob_created = client.post(
        "/tasks",
        headers=bob,
        json={"title": "Bob private task"},
    )
    assert bob_created.status_code == 201

    alice_tasks = client.get("/tasks", headers=alice)
    bob_tasks = client.get("/tasks", headers=bob)

    assert [task["id"] for task in alice_tasks.json()] == [task_id]
    assert [task["id"] for task in bob_tasks.json()] == [
        bob_created.json()["id"]
    ]


def test_task_operations_require_authentication(client):
    assert client.get("/tasks").status_code == 401

    assert client.post(
        "/tasks", json={"title": "Anonymous task"}
    ).status_code == 401

    assert client.get("/tasks/1").status_code == 401

    assert client.patch(
        "/tasks/1", json={"status": "DONE"}
    ).status_code == 401

    assert client.delete("/tasks/1").status_code == 401