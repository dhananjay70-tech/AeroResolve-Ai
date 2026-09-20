from typing import Any, Optional

from app.services.backend_client import backend_client


async def check_and_resolve(
    pnr: str, message: str, conversation_id: Optional[str] = None
) -> dict[str, Any]:
    """Tool: ask the Node backend's policy engine what this booking is entitled to.

    This is the single source of truth for policy decisions - the Node
    backend's /api/agent/chat endpoint evaluates the airline's disruption
    policy AND, in the same call, executes any standard approved actions
    (meal voucher, lounge access, hotel) for delay entitlements. There is no
    separate "check" vs "execute" endpoint on the backend, so this one tool
    covers both; nothing here re-implements or guesses at policy.
    """
    return await backend_client.agent_chat(pnr, message, conversation_id)
