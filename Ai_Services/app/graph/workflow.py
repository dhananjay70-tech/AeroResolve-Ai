from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from app.graph.nodes import (
    check_policy_and_resolve,
    generate_response,
    handle_escalation,
    load_context,
    understand_intent,
)
from app.graph.state import AgentState


def _route_after_intent(state: AgentState) -> str:
    return "generate_response" if state.get("error") else "load_context"


def _route_after_context(state: AgentState) -> str:
    return "generate_response" if state.get("error") else "check_policy"


def _route_after_policy(state: AgentState) -> str:
    if state.get("error"):
        return "generate_response"
    if state.get("unsupported_request") or state.get("manager_requested"):
        return "handle_escalation"
    return "generate_response"


def build_workflow():
    graph = StateGraph(AgentState)

    graph.add_node("understand_intent", understand_intent)
    graph.add_node("load_context", load_context)
    graph.add_node("check_policy", check_policy_and_resolve)
    graph.add_node("handle_escalation", handle_escalation)
    graph.add_node("generate_response", generate_response)

    graph.add_edge(START, "understand_intent")
    graph.add_conditional_edges(
        "understand_intent",
        _route_after_intent,
        {"load_context": "load_context", "generate_response": "generate_response"},
    )
    graph.add_conditional_edges(
        "load_context",
        _route_after_context,
        {"check_policy": "check_policy", "generate_response": "generate_response"},
    )
    graph.add_conditional_edges(
        "check_policy",
        _route_after_policy,
        {"handle_escalation": "handle_escalation", "generate_response": "generate_response"},
    )
    graph.add_edge("handle_escalation", "generate_response")
    graph.add_edge("generate_response", END)

    # In-process checkpointer, keyed by thread_id (the conversation_id - see
    # main.py) - lets follow-up turns in the same conversation see prior
    # turns via state["history"], without a new backend endpoint or storing
    # policy facts outside the backend. Lost on process restart, which is
    # acceptable for this prototype; conversation history in Postgres
    # (schema.messages) remains the durable record.
    return graph.compile(checkpointer=InMemorySaver())


workflow = build_workflow()
