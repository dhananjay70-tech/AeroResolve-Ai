from typing import Any

from app.services.backend_client import backend_client


async def get_customer_info(pnr: str) -> dict[str, Any]:
    """Tool: get customer information for a PNR, via the Node backend."""
    return await backend_client.get_customer(pnr)
