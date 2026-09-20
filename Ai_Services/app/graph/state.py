from typing import Any, Optional, TypedDict


class AgentState(TypedDict, total=False):
    """Explicit graph state. LangGraph passes and merges plain dict updates
    per node - nothing here is global or mutated in place."""

    user_message: str
    pnr: Optional[str]
    conversation_id: Optional[str]

    # Prior turns for this conversation, restored across requests by the
    # graph's checkpointer (see workflow.py) and keyed by conversation_id in
    # main.py. Each entry is {"role": "user"|"assistant", "content": str}.
    # Purely a transcript for prompting - never a source of policy/fact data.
    history: list[dict[str, str]]

    customer: Optional[dict[str, Any]]
    booking: Optional[dict[str, Any]]
    flight: Optional[dict[str, Any]]

    intent: Optional[str]
    unsupported_request: bool
    manager_requested: bool

    available_actions: Optional[dict[str, Any]]  # backend's resolution object
    applied_actions: Optional[list[dict[str, Any]]]
    selected_action: Optional[str]
    action_result: Optional[dict[str, Any]]

    escalation: Optional[dict[str, Any]]
    supervisor_call: Optional[dict[str, Any]]

    response: Optional[str]
    error: Optional[str]
