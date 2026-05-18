import json

from fastapi import APIRouter, HTTPException

from models.schemas import QARequest
from services.ollama_service import call_ollama, build_qa_payload, language_validation_pass

router = APIRouter()


def truncate_conversation_history(history: list, max_turns: int = 6) -> list:
    """
    Truncate conversation history to the most recent turns to prevent memory bloat.
    Keeps the last max_turns messages (3 back-and-forth exchanges by default).
    """
    if len(history) <= max_turns:
        return history
    return history[-max_turns:]


@router.post("/")
async def qa_endpoint(request: QARequest):
    # ── Truncate conversation history to prevent memory bloat ──────────────
    truncated_history = truncate_conversation_history(request.conversation_history, max_turns=6)
    
    # ── Build the user turn for the Q&A call ──────────────────────────────
    # Only pass clinical_context (not narrative_explanation) as per updated spec.
    # The system prompt now instructs the model to generate friendly explanations.
    qna_user_prompt = f"""\
=== Clinical context (detailed factual record from patient's document) ===
{request.clinical_context}

=== Recent conversation (last few exchanges) ===
{json.dumps(truncated_history, ensure_ascii=False, indent=2)}

=== Patient's latest question ===
{request.question}

Please answer kindly and simply in 3 to 5 short sentences. Write as if you are a kind friend \
sitting beside them. Use the language of their question. Cover what they need to know in simple \
terms. Never use medical jargon. Be reassuring and gentle.\
"""

    # Build payload with profile context injection and language preference
    payload = build_qa_payload(qna_user_prompt, language=request.language)

    try:
        ollama_response = await call_ollama(payload, timeout=60)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Ollama. Please make sure Ollama is running.",
        )

    answer: str = ollama_response.get("message", {}).get("content", "").strip()
    
    # ── Language validation pass (post-processing) ──────────────────────────
    # Ensure the answer is entirely in the requested language
    if request.language.lower() != "english":
        try:
            answer = await language_validation_pass(answer, request.language)
        except Exception as e:
            # Language validation failure should not break the flow
            print(f"Warning: Language validation pass failed for Q&A: {e}")
    
    return {"answer": answer}