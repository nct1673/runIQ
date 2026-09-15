"""Provider-agnostic LLM abstraction so app.services.coach isn't
hard-coupled to one LLM vendor. Swap the implementation here, not at every
call site.
"""
from app.core.config import get_settings

settings = get_settings()


def complete(system_prompt: str, user_prompt: str, evidence: list[dict]) -> str:
    raise NotImplementedError(
        f"Phase 6: call {settings.llm_provider} with system_prompt + user_prompt + evidence"
    )
