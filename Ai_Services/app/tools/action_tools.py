from typing import Any, Optional

from app.services.backend_client import backend_client


async def create_escalation(
    booking_id: str, reason: str, requested_action: Optional[dict] = None
) -> dict[str, Any]:
    """Tool: file a supervisor escalation via the Node backend.

    Used when a customer asks for something outside what the policy engine's
    resolution already covers (e.g. compensation beyond policy, a large fare
    waiver, a legal threat). This never approves anything itself - it only
    creates a review record through the backend's real escalation endpoint.
    """
    return await backend_client.create_escalation(booking_id, reason, requested_action)
