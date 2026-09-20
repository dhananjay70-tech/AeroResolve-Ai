from typing import Any, Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    success: bool = True
    service: str = "AeroResolve AI Service"
    status: str = "healthy"


class ChatResponse(BaseModel):
    success: bool
    message: str
    conversation_id: Optional[str] = None
    resolution: Optional[dict[str, Any]] = None
    escalation: Optional[dict[str, Any]] = None
    supervisor_call: Optional[dict[str, Any]] = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
