from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import JWT_ALGORITHM, JWT_SECRET, settings
from app.features.auth import sessions


def _login(client, email):
    credentials = {"email": email, "password": "Disposable-Password-2026"}
    user = client.post("/auth/register", json=credentials)
    assert user.status_code == 201
    response = client.post("/auth/login", json=credentials)
    assert response.status_code == 200
    return user.json(), response


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_refresh_after_access_expiry_rotates_cookie_and_rejects_replay(client):
    user, login = _login(client, "refresh@example.com")
    signed_in = login.json()
    session_id = signed_in["session_id"]
    cookie_name = f"taskboard_refresh_{session_id}"
    old_cookie = client.cookies[cookie_name]
    assert old_cookie not in login.text
    assert login.headers["cache-control"] == "no-store"
    assert "httponly" in login.headers["set-cookie"].lower()
    assert "samesite=lax" in login.headers["set-cookie"].lower()

    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {"sub": str(user["id"]), "iat": now - timedelta(minutes=20), "exp": now - timedelta(seconds=1)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    assert client.get("/auth/me", headers=_bearer(expired)).status_code == 401

    refreshed = client.post("/auth/refresh", json={"session_id": session_id})
    assert refreshed.status_code == 200
    assert refreshed.json()["session_id"] == session_id
    assert refreshed.json()["access_token"] != signed_in["access_token"]
    assert client.cookies[cookie_name] != old_cookie
    assert client.get("/auth/me", headers=_bearer(refreshed.json()["access_token"])).json() == user

    replay = client.post(
        "/auth/refresh",
        json={"session_id": session_id},
        headers={"Cookie": f"{cookie_name}={old_cookie}"},
    )
    assert replay.status_code == 401
    assert "set-cookie" not in replay.headers
    assert client.post("/auth/refresh", json={"session_id": session_id}).status_code == 200


def test_logout_revokes_only_the_selected_session(client):
    first, first_login = _login(client, "first@example.com")
    second, second_login = _login(client, "second@example.com")
    first_id, second_id = [
        response.json()["session_id"] for response in (first_login, second_login)
    ]
    first_cookie = f"taskboard_refresh_{first_id}"

    for user, session_id in ((first, first_id), (second, second_id)):
        response = client.post("/auth/refresh", json={"session_id": session_id})
        assert response.status_code == 200
        assert client.get("/auth/me", headers=_bearer(response.json()["access_token"])).json() == user

    token = client.cookies[first_cookie]
    logged_out = client.post("/auth/logout", json={"session_id": first_id})
    assert logged_out.status_code == 204
    assert first_cookie not in client.cookies
    assert client.post(
        "/auth/refresh",
        json={"session_id": first_id},
        headers={"Cookie": f"{first_cookie}={token}"},
    ).status_code == 401
    assert client.post("/auth/refresh", json={"session_id": second_id}).status_code == 200


def test_refresh_session_has_fixed_expiry(client, monkeypatch):
    initial = sessions.utc_now()
    _, login = _login(client, "expiry@example.com")
    session_id = login.json()["session_id"]
    expiry = initial + timedelta(days=settings.REFRESH_SESSION_EXPIRE_DAYS)
    monkeypatch.setattr(sessions, "utc_now", lambda: expiry - timedelta(seconds=30))
    assert client.post("/auth/refresh", json={"session_id": session_id}).status_code == 200

    monkeypatch.setattr(sessions, "utc_now", lambda: expiry + timedelta(minutes=1))
    assert client.post("/auth/refresh", json={"session_id": session_id}).status_code == 401
