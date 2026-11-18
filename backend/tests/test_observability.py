import io
import json
import logging
import uuid
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.exception_handlers import unhandled_exception_handler
from app.core.logging import JsonFormatter, logger, setup_logging
from app.core.middleware import RequestLoggingMiddleware
from app.main import app


def test_successful_response_has_valid_request_id(client):
    response = client.get("/health")
    assert response.status_code == 200

    request_id = response.headers.get("X-Request-ID")
    assert request_id is not None
    # Verify it is a valid UUID4
    parsed_uuid = uuid.UUID(request_id, version=4)
    assert str(parsed_uuid) == request_id

    # Verify X-Process-Time-Ms is present and measures server processing duration
    process_time = response.headers.get("X-Process-Time-Ms")
    assert process_time is not None
    assert float(process_time) >= 0


def test_separate_requests_receive_different_request_ids(client):
    r1 = client.get("/health")
    r2 = client.get("/health")

    id1 = r1.headers.get("X-Request-ID")
    id2 = r2.headers.get("X-Request-ID")

    assert id1 is not None and id2 is not None
    assert id1 != id2


def test_client_supplied_request_id_is_replaced(client):
    spoofed_id = "client-spoofed-id-12345"
    response = client.get("/health", headers={"X-Request-ID": spoofed_id})

    returned_id = response.headers.get("X-Request-ID")
    assert returned_id is not None
    assert returned_id != spoofed_id
    # Assert server generated a fresh valid UUID
    uuid.UUID(returned_id, version=4)


def test_expected_errors_retain_contracts_and_receive_request_ids(client):
    # 401 Unauthorized
    r_401 = client.get("/auth/me")
    assert r_401.status_code == 401
    assert r_401.headers.get("WWW-Authenticate") == "Bearer"
    assert r_401.json() == {"detail": "Invalid or expired access token"}
    uuid.UUID(r_401.headers.get("X-Request-ID"), version=4)

    # 404 Not Found (route exists but task does not exist or user doesn't own it)
    # Testing unmatched endpoint
    r_404 = client.get("/nonexistent-endpoint-404")
    assert r_404.status_code == 404
    assert r_404.json() == {"detail": "Not Found"}
    uuid.UUID(r_404.headers.get("X-Request-ID"), version=4)

    # 422 Unprocessable Entity
    r_422 = client.post("/auth/login", json={"email": "invalid"})
    assert r_422.status_code == 422
    assert "detail" in r_422.json()
    uuid.UUID(r_422.headers.get("X-Request-ID"), version=4)


def test_unexpected_failure_returns_safe_json_with_matching_ids(monkeypatch):
    sentinel_secret = "TOP_SECRET_DATABASE_CREDENTIAL_999"

    def crashing_auth(*args, **kwargs):
        raise RuntimeError(f"Database connection lost: {sentinel_secret}")

    monkeypatch.setattr("app.features.auth.router.authenticate_user", crashing_auth)

    with TestClient(app, raise_server_exceptions=False) as test_client:
        response = test_client.post(
            "/auth/login",
            json={"email": "crash-test@example.com", "password": "Password123!"},
        )

    assert response.status_code == 500
    header_id = response.headers.get("X-Request-ID")
    assert header_id is not None
    uuid.UUID(header_id, version=4)

    body = response.json()
    assert body == {
        "detail": "Internal server error",
        "request_id": header_id,
    }

    # Ensure sensitive sentinel is not in response text
    assert sentinel_secret not in response.text


def test_structured_request_logs_format_and_route_matching():
    log_capture = io.StringIO()
    test_handler = logging.StreamHandler(log_capture)
    test_handler.setFormatter(JsonFormatter())
    logger.addHandler(test_handler)

    try:
        with TestClient(app) as test_client:
            res_matched = test_client.get("/health")
            res_unmatched = test_client.get("/unmatched/random/route")

        output = log_capture.getvalue().strip()
        lines = [json.loads(line) for line in output.split("\n") if line.strip()]

        # Find request summary for /health
        matched_log = next(
            (l for l in lines if l.get("request_id") == res_matched.headers.get("X-Request-ID")),
            None,
        )
        assert matched_log is not None
        assert matched_log["method"] == "GET"
        assert matched_log["route"] == "/health"
        assert matched_log["status"] == 200
        assert matched_log["status_code"] == 200
        assert matched_log["duration_ms"] >= 0
        assert matched_log["level"] == "INFO"
        assert "timestamp" in matched_log

        # Find request summary for unmatched route
        unmatched_log = next(
            (l for l in lines if l.get("request_id") == res_unmatched.headers.get("X-Request-ID")),
            None,
        )
        assert unmatched_log is not None
        assert unmatched_log["method"] == "GET"
        assert unmatched_log["route"] == "unmatched_route"
        assert unmatched_log["status"] == 404
    finally:
        logger.removeHandler(test_handler)


def test_unexpected_failure_logs_safe_diagnostics_without_sentinel(monkeypatch):
    sentinel_secret = "LEAK_SENSITIVE_SECRET_TOKEN_777"

    def crashing_auth(*args, **kwargs):
        raise ValueError(f"Fatal error with {sentinel_secret}")

    monkeypatch.setattr("app.features.auth.router.authenticate_user", crashing_auth)

    log_capture = io.StringIO()
    test_handler = logging.StreamHandler(log_capture)
    test_handler.setFormatter(JsonFormatter())
    logger.addHandler(test_handler)

    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            response = test_client.post(
                "/auth/login",
                json={"email": "crash-test@example.com", "password": "Password123!"},
            )

        assert response.status_code == 500
        req_id = response.headers.get("X-Request-ID")

        all_logs_text = log_capture.getvalue()
        # Ensure sentinel secret NEVER appears in any application logs
        assert sentinel_secret not in all_logs_text

        lines = [json.loads(line) for line in all_logs_text.strip().split("\n") if line.strip()]
        error_log = next(
            (l for l in lines if l.get("event") == "unexpected_error" and l.get("request_id") == req_id),
            None,
        )
        assert error_log is not None
        assert error_log["exception_class"] == "ValueError"
        assert isinstance(error_log["stack"], list)
        assert len(error_log["stack"]) > 0
        first_frame = error_log["stack"][0]
        assert "file" in first_frame and "line" in first_frame and "function" in first_frame
    finally:
        logger.removeHandler(test_handler)


def test_logging_setup_idempotency_does_not_duplicate_handlers():
    # Calling setup_logging multiple times should not create duplicate handlers
    h_before = len(logger.handlers)
    setup_logging()
    setup_logging()
    setup_logging()
    assert len(logger.handlers) == h_before


def test_cors_behavior_on_unexpected_500_errors():
    test_app = FastAPI(debug=False)
    test_app.add_exception_handler(Exception, unhandled_exception_handler)
    test_app.add_middleware(RequestLoggingMiddleware)
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://allowed-frontend.com"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @test_app.get("/test-crash")
    def crash():
        raise RuntimeError("Controlled crash for CORS test")

    client = TestClient(test_app, raise_server_exceptions=False)

    # Origin allowed
    r_allowed = client.get("/test-crash", headers={"Origin": "http://allowed-frontend.com"})
    assert r_allowed.status_code == 500
    assert r_allowed.headers.get("Access-Control-Allow-Origin") == "http://allowed-frontend.com"
    req_id = r_allowed.headers.get("X-Request-ID")
    assert req_id is not None
    assert r_allowed.json()["request_id"] == req_id

    # Origin disallowed
    r_disallowed = client.get("/test-crash", headers={"Origin": "http://disallowed-frontend.com"})
    assert r_disallowed.status_code == 500
    assert "Access-Control-Allow-Origin" not in r_disallowed.headers
