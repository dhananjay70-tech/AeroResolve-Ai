from typing import Any

from app.services.backend_client import backend_client


async def request_supervisor_call(escalation_id: str) -> dict[str, Any]:
    """Tool: ask the Node backend to start a real outbound supervisor call
    for an existing escalation. Node owns the voice provider credentials and
    decides call status - this never places or simulates a call itself.
    """
    return await backend_client.initiate_supervisor_call(escalation_id)
