from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    pnr: Optional[str] = None
    conversation_id: Optional[str] = None
