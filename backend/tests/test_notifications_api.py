"""Owner-only notification tests. Does not send email, SMS, or government notices."""

from __future__ import annotations

import os
import unittest

from sqlalchemy import text

from app.db.base import Base
from app.db.init_db import ensure_application_schema
from app.db.session import check_database, get_engine, load_database_env, reset_engine
from app.models import citizen as _citizen_model  # noqa: F401
from app.models import documents as _documents_model  # noqa: F401
from app.models import history as _history_model  # noqa: F401
from app.models import notifications as _notifications_model  # noqa: F401
from app.models import readiness as _readiness_model  # noqa: F401
from app.models import uploads as _uploads_model  # noqa: F401
from app.models import user as _user_model  # noqa: F401


def _postgres_ready() -> bool:
    load_database_env()
    test_url = (os.environ.get("TEST_DATABASE_URL") or "").strip()
    if not test_url:
        return False
    os.environ["SCHEME_PREDICTOR_USE_TEST_DB"] = "1"
    reset_engine()
    return check_database()


class NotificationContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)

    def test_unauthenticated_notification_list_returns_401(self) -> None:
        self.assertEqual(self.client.get("/api/v1/notifications").status_code, 401)

    def test_unauthenticated_notification_read_returns_401(self) -> None:
        self.assertEqual(
            self.client.patch("/api/v1/notifications/not-a-real-id/read").status_code,
            401,
        )

    def test_unauthenticated_notification_delete_returns_401(self) -> None:
        self.assertEqual(
            self.client.delete("/api/v1/notifications/not-a-real-id").status_code,
            401,
        )

    def test_openapi_lists_notification_routes(self) -> None:
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/v1/notifications", paths)
        self.assertIn("/api/v1/notifications/{notification_id}/read", paths)
        self.assertIn("/api/v1/notifications/{notification_id}", paths)
        self.assertIn("get", paths["/api/v1/notifications"])
        self.assertIn("patch", paths["/api/v1/notifications/{notification_id}/read"])
        self.assertIn("delete", paths["/api/v1/notifications/{notification_id}"])


class NotificationDatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not _postgres_ready():
            raise unittest.SkipTest("PostgreSQL test database is not configured or unavailable")
        from fastapi.testclient import TestClient

        from app.main import app

        reset_engine()
        engine = get_engine()
        if engine is None:
            raise unittest.SkipTest("PostgreSQL test database is not configured")
        Base.metadata.create_all(bind=engine)
        ensure_application_schema(engine)
        cls.engine = engine
        cls._client_cm = TestClient(app)
        cls.client = cls._client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls._client_cm.__exit__(None, None, None)
        reset_engine()

    def setUp(self) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("DELETE FROM notifications"))
            connection.execute(text("DELETE FROM supporting_uploads"))
            connection.execute(text("DELETE FROM application_readiness"))
            connection.execute(text("DELETE FROM document_checklist_progress"))
            connection.execute(text("DELETE FROM recommendation_history"))
            connection.execute(text("DELETE FROM citizen_profiles"))
            connection.execute(text("DELETE FROM users"))

    def _headers(self, email: str, name: str = "Reminder Owner") -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"full_name": name, "email": email, "password": "password123"},
        )
        token = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "password123"},
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_owner_sees_profile_reminder_and_other_user_gets_404(self) -> None:
        owner = self._headers("notify.owner@example.com")
        other = self._headers("notify.other@example.com")

        listed = self.client.get("/api/v1/notifications", headers=owner)
        self.assertEqual(listed.status_code, 200)
        body = listed.json()
        self.assertGreaterEqual(body["unread_count"], 1)
        self.assertIn("not government", body["disclaimer"].lower())
        types = {item["type"] for item in body["notifications"]}
        self.assertIn("profile_incomplete", types)
        reminder = next(item for item in body["notifications"] if item["type"] == "profile_incomplete")
        self.assertEqual(reminder["related_feature"], "wallet")
        self.assertEqual(reminder["href"], "/wallet")
        self.assertFalse(reminder["is_read"])
        notification_id = reminder["notification_id"]

        foreign_read = self.client.patch(
            f"/api/v1/notifications/{notification_id}/read",
            headers=other,
        )
        self.assertEqual(foreign_read.status_code, 404)

        foreign_delete = self.client.delete(
            f"/api/v1/notifications/{notification_id}",
            headers=other,
        )
        self.assertEqual(foreign_delete.status_code, 404)

        marked = self.client.patch(
            f"/api/v1/notifications/{notification_id}/read",
            headers=owner,
        )
        self.assertEqual(marked.status_code, 200)
        self.assertTrue(marked.json()["is_read"])

        deleted = self.client.delete(f"/api/v1/notifications/{notification_id}", headers=owner)
        self.assertEqual(deleted.status_code, 204)
        after = self.client.get("/api/v1/notifications", headers=owner).json()
        remaining_ids = {item["notification_id"] for item in after["notifications"]}
        self.assertNotIn(notification_id, remaining_ids)

    def test_account_delete_removes_notification_rows(self) -> None:
        headers = self._headers("notify.delete@example.com")
        listed = self.client.get("/api/v1/notifications", headers=headers)
        self.assertEqual(listed.status_code, 200)
        self.assertGreaterEqual(listed.json()["unread_count"], 1)

        deleted = self.client.delete("/api/v1/auth/me", headers=headers)
        self.assertEqual(deleted.status_code, 204)
        with self.engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM notifications")).scalar()
        self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
