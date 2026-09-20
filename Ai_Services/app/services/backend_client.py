import asyncio
from typing import Any, Optional

import httpx

from app.config import get_logger, settings

logger = get_logger(__name__)


class BackendClientError(Exception):
    """Raised for any failure talking to the Node backend.

    status_code is the HTTP status returned by the backend, or 0 for a
    connection failure/timeout that never reached it.
    """

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class BackendClient:
    """Centralized async client for the existing Node/Express backend.

    Every AI_Services call to the backend goes through here. This is the ONLY
    place that talks HTTP to Node - nothing else in this service scatters
    httpx calls, and nothing in this service talks to PostgreSQL directly.

    The backend's customer/booking/agent/escalation routes require a JWT
    (authMiddleware), so this client authenticates as a dedicated service
    account (logging in, or registering it on first run) and reuses that
    token, the same way any other API client would - it is not given any
    special bypass.
    """

    def __init__(self, base_url: str = settings.BACKEND_URL):
        self._client = httpx.AsyncClient(base_url=base_url, timeout=10.0)
        self._token: Optional[str] = None
        self._auth_lock = asyncio.Lock()

    async def aclose(self):
        await self._client.aclose()

    async def _ensure_token(self) -> str:
        if self._token:
            return self._token
        async with self._auth_lock:
            if self._token:
                return self._token
            self._token = await self._login_or_register()
            return self._token

    async def _login_or_register(self) -> str:
        email = settings.BACKEND_SERVICE_EMAIL
        password = settings.BACKEND_SERVICE_PASSWORD
        if not email or not password:
            raise BackendClientError(
                0, "AI service backend credentials are not configured."
            )

        try:
            resp = await self._client.post(
                "/api/auth/login", json={"email": email, "password": password}
            )
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise BackendClientError(0, "Could not reach the backend service.") from exc

        if resp.status_code == 200:
            logger.info("AI service authenticated with backend.")
            return resp.json()["data"]["token"]

        logger.info("Backend login failed (%s); registering service account.", resp.status_code)
        try:
            resp = await self._client.post(
                "/api/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "fullName": settings.BACKEND_SERVICE_NAME,
                },
            )
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise BackendClientError(0, "Could not reach the backend service.") from exc

        if resp.status_code in (200, 201):
            logger.info("AI service account registered with backend.")
            return resp.json()["data"]["token"]

        raise BackendClientError(
            resp.status_code, "Unable to authenticate the AI service with the backend."
        )

    async def _request(
        self, method: str, path: str, *, json: Optional[dict] = None, _retry: bool = True
    ) -> dict[str, Any]:
        token = await self._ensure_token()
        try:
            resp = await self._client.request(
                method, path, json=json, headers={"Authorization": f"Bearer {token}"}
            )
        except httpx.TimeoutException as exc:
            logger.warning("Backend request timed out: %s %s", method, path)
            raise BackendClientError(0, "The backend service timed out.") from exc
        except httpx.ConnectError as exc:
            logger.warning("Backend connection failed: %s %s", method, path)
            raise BackendClientError(0, "Could not reach the backend service.") from exc

        if resp.status_code == 401 and _retry:
            logger.info("Backend token expired/invalid; re-authenticating once.")
            self._token = None
            return await self._request(method, path, json=json, _retry=False)

        body: dict[str, Any] = {}
        try:
            body = resp.json()
        except ValueError:
            pass

        logger.info("Backend %s %s -> %s", method, path, resp.status_code)

        if resp.status_code >= 400:
            message = body.get("message", "The backend returned an unexpected error.")
            raise BackendClientError(resp.status_code, message)

        return body

    # --- Public API, mapped 1:1 to the existing Node routes ---

    async def get_customer(self, pnr: str) -> dict[str, Any]:
        body = await self._request("GET", f"/api/customers/{pnr}")
        return body["data"]

    async def get_booking(self, pnr: str) -> dict[str, Any]:
        body = await self._request("GET", f"/api/bookings/{pnr}")
        return body["data"]

    async def get_booking_status(self, pnr: str) -> dict[str, Any]:
        body = await self._request("GET", f"/api/bookings/{pnr}/status")
        return body["data"]

    async def agent_chat(
        self, pnr: str, message: str, conversation_id: Optional[str] = None
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"pnr": pnr, "message": message}
        if conversation_id:
            payload["conversationId"] = conversation_id
        body = await self._request("POST", "/api/agent/chat", json=payload)
        return body["data"]

    async def create_escalation(
        self, booking_id: str, reason: str, requested_action: Optional[dict] = None
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"bookingId": booking_id, "reason": reason}
        if requested_action:
            payload["requestedAction"] = requested_action
        body = await self._request("POST", "/api/escalations", json=payload)
        return body["data"]

    async def get_escalation(self, escalation_id: str) -> dict[str, Any]:
        body = await self._request("GET", f"/api/escalations/{escalation_id}")
        return body["data"]

    async def initiate_supervisor_call(self, escalation_id: str) -> dict[str, Any]:
        # The Node backend owns the Exotel credentials and the real outbound
        # call; this only asks it to start one for an existing escalation.
        body = await self._request("POST", f"/api/voice/escalations/{escalation_id}/call")
        return body["data"]


backend_client = BackendClient()
