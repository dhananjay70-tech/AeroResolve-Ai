from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_logger, settings
from app.graph.workflow import workflow
from app.models.requests import ChatRequest
from app.models.responses import ChatResponse, HealthResponse
from app.services.backend_client import backend_client

logger = get_logger(__name__)

app = FastAPI(title="AeroResolve AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Something went wrong. Please try again."},
    )


@app.on_event("shutdown")
async def shutdown():
    await backend_client.aclose()


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse()


@app.post("/api/ai/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    initial_state = {
        "user_message": payload.message,
        "pnr": payload.pnr,
        "conversation_id": payload.conversation_id,
        "unsupported_request": False,
    }

    # Thread the checkpointer by the real conversation_id once one exists, so
    # every follow-up in the same conversation restores state["history"]
    # from the previous turn. The very first message of a conversation has
    # no conversation_id yet (Node assigns it) - fall back to a per-PNR
    # thread for that single turn; there is no prior history to lose there.
    thread_id = payload.conversation_id or f"pnr:{payload.pnr}:new"
    config = {"configurable": {"thread_id": thread_id}}

    result = await workflow.ainvoke(initial_state, config=config)

    return ChatResponse(
        success=not bool(result.get("error")),
        message=result.get("response") or "Sorry, something went wrong. Please try again.",
        conversation_id=result.get("conversation_id"),
        resolution=result.get("available_actions"),
        escalation=result.get("escalation"),
        supervisor_call=result.get("supervisor_call"),
    )
