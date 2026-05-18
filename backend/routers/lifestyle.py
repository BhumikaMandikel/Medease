from fastapi import APIRouter, HTTPException
from models.schemas import LifestyleQARequest, LifestyleQAResponse
from services.profile_service import load_profile, build_profile_context_prompt
from services.ollama_service import call_ollama, language_validation_pass
import re

router = APIRouter()

LIFESTYLE_SYSTEM_PROMPT = """\
You are MedEase, a warm and caring health companion helping people make informed \
decisions about their daily life — food, activities, and general health questions.

Your rules:
1. Answer in 3 to 5 short sentences only.
2. Use only simple everyday words. No medical jargon.
3. Be warm, gentle, and encouraging. Never alarm the patient.
4. For food questions: Use a clear yes/no/sometimes structure. Explain why briefly.
5. For activity questions: Use safe/careful/avoid structure. Give simple guidance.
6. For medicine interaction questions: ALWAYS recommend consulting their doctor. \
Never give definitive answers about drug interactions.
7. For symptom questions: ALWAYS recommend seeing their doctor. Never diagnose.
8. Reply in the same language as the question.
9. Use the patient context provided to personalize your answer, but never mention \
that you have a profile or prior history.
10. End your response with either CONFIDENCE:HIGH or CONFIDENCE:LOW based on how \
certain you are about the answer. Use CONFIDENCE:LOW for:
    - Complex medicine interactions
    - Unusual symptoms or conditions
    - Questions requiring specific medical knowledge beyond general health advice
    - Situations where individual variation matters significantly

Examples:
- "Can I eat mangoes?" → "Yes, mangoes are generally safe and healthy! They have \
natural sugars, so if you have diabetes, enjoy them in small portions. One small \
mango or half a cup is a good amount. They are rich in vitamins too. CONFIDENCE:HIGH"

- "Is 30 minutes of walking safe?" → "Yes, 30 minutes of walking is excellent for \
your health! Start slowly if you haven't walked much recently. Wear comfortable shoes \
and carry water. If you feel dizzy or very tired, rest and talk to your doctor. CONFIDENCE:HIGH"

- "Can I take paracetamol with my medicines?" → "I cannot say for certain without \
knowing all your medicines and conditions. Some medicines can interact with paracetamol. \
Please check with your doctor or pharmacist before taking it. They can review your \
full medicine list safely. CONFIDENCE:LOW"
"""


@router.post("/qa", response_model=LifestyleQAResponse)
async def lifestyle_qa(request: LifestyleQARequest):
    """
    Answer general health, food, and lifestyle questions using profile context.
    """
    try:
        # Load profile and build context
        profile = load_profile()
        profile_context = build_profile_context_prompt(profile, include_meal_times=False)
        
        # Build system prompt with profile context
        system_prompt = LIFESTYLE_SYSTEM_PROMPT
        if profile_context:
            system_prompt = profile_context + "\n\n" + system_prompt
        
        # Add language enforcement
        language_note = f"""

IMPORTANT: The user's preferred language is {request.language}. Reply in {request.language}.
Transliterate medical terms into {request.language} script when writing in {request.language}.
"""
        system_prompt = system_prompt + language_note
        
        # Build Ollama payload
        payload = {
            "model": "gemma4:e4b",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.question}
            ],
            "stream": False,
            "options": {
                "temperature": 0.6,
                "num_predict": 1024
            }
        }
        
        # Call Ollama with 60s timeout
        result = await call_ollama(payload, timeout=60)
        
        # Extract answer
        answer = result.get("message", {}).get("content", "")
        
        # Parse confidence level (before language validation to preserve marker)
        confidence_match = re.search(r'CONFIDENCE:(HIGH|LOW)', answer, re.IGNORECASE)
        suggested_cloud = False
        
        if confidence_match:
            confidence = confidence_match.group(1).upper()
            # Remove confidence marker from answer
            answer = re.sub(r'\s*CONFIDENCE:(HIGH|LOW)\s*', '', answer, flags=re.IGNORECASE).strip()
            
            if confidence == "LOW":
                suggested_cloud = True
        
        # Apply language validation pass for non-English languages
        if request.language:
            try:
                answer = await language_validation_pass(answer, request.language)
            except Exception as e:
                # Language validation failure should not break the flow
                print(f"Warning: Language validation pass failed for lifestyle Q&A: {e}")
        
        return LifestyleQAResponse(
            answer=answer,
            suggested_cloud=suggested_cloud
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process lifestyle question: {str(e)}"
        )


@router.post("/cloud-qa", response_model=LifestyleQAResponse)
async def cloud_qa(request: LifestyleQARequest):
    """
    Answer questions using cloud API after anonymizing the question.
    This endpoint would call Gemini or another cloud model.
    For now, returns a placeholder response.
    """
    try:
        # TODO: Implement cloud API integration
        # 1. Use Gemma 4 locally to anonymize the question
        # 2. Call Gemini API or other cloud model
        # 3. Return the response
        
        return LifestyleQAResponse(
            answer="Cloud Q&A feature is not yet implemented. Please consult your doctor for this question.",
            suggested_cloud=False
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process cloud question: {str(e)}"
        )

