from typing import Any

from app.services.backend_client import backend_client


async def get_booking_info(pnr: str) -> dict[str, Any]:
    """Tool: get booking + flight information for a PNR, via the Node backend."""
    return await backend_client.get_booking(pnr)


async def get_flight_status(pnr: str) -> dict[str, Any]:
    """Tool: get a lightweight booking/flight status summary, via the Node backend."""
    return await backend_client.get_booking_status(pnr)
