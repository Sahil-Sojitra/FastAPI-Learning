import jwt

from app.settings import JWT_ALGORITHM, JWT_SECRET

def test_register_user(client):
    payload = {
        "email": "sahil@example.com",
        "password": "Learning-FastAPI-2026!",
    }

    response = client.post("/auth/register", json=payload)

    assert response.status_code == 201

    user = response.json()

    assert isinstance(user["id"], int)
    assert user["email"] == payload["email"]
    assert set(user) == {"id", "email"}

    duplicate = client.post("/auth/register", json=payload)

    assert duplicate.status_code == 409


def test_login(client):
    credentials = {
        "email": "sahil@example.com",
        "password": "Learning-FastAPI-2026!",
    }

    registered = client.post("/auth/register", json=credentials)
    assert registered.status_code == 201

    response = client.post("/auth/login", json=credentials)
    assert response.status_code == 200

    token = response.json()
    assert token["token_type"] == "bearer"

    payload = jwt.decode(
        token["access_token"],
        JWT_SECRET,
        algorithms=[JWT_ALGORITHM],
        options={"require": ["sub", "iat", "exp"]},
    )
    assert payload["sub"] == str(registered.json()["id"])
    assert payload["exp"] - payload["iat"] == 900

    wrong_password = client.post(
        "/auth/login",
        json={
            "email": credentials["email"],
            "password": "incorrect-password",
        },
    )
    assert wrong_password.status_code == 401

    unknown_user = client.post(
        "/auth/login",
        json={
            "email": "unknown@example.com",
            "password": credentials["password"],
        },
    )
    assert unknown_user.status_code == 401
    assert unknown_user.json() == wrong_password.json()