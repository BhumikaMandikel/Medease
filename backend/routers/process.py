import base64
import json
import mimetypes

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from models.schemas import AnalysisResult
from services.ollama_service import (
    ANALYSIS_USER_PROMPT,
    call_ollama,
    build_analysis_payload,
    language_validation_pass,
)
from services.pdf_service import process_pdf
from services.ocr_service import process_image_with_ocr
from services.profile_service import (
    load_profile,
    save_profile,
    merge_conditions_into_profile,
    merge_allergies_into_profile,
    add_visit_to_profile,
)
from services.medicine_timing_service import enhance_medicine_timings

router = APIRouter()

ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png"}


def _strip_fences(text: str) -> str:
    """Remove markdown code fences that the model may wrap around JSON."""
    stripped = text.strip()
    if stripped.startswith("```"):
        # Remove opening fence (e.g. ```json or ```)
        first_newline = stripped.find("\n")
        if first_newline != -1:
            stripped = stripped[first_newline + 1:]
        # Remove closing fence
        if stripped.endswith("```"):
            stripped = stripped[: stripped.rfind("```")].strip()
    return stripped


def _sanitize_json_data(data: dict) -> dict:
    """
    Sanitize JSON data to ensure it matches the expected schema.
    Removes None values from arrays and ensures proper types.
    """
    # Sanitize medicines array
    if "medicines" in data and isinstance(data["medicines"], list):
        for medicine in data["medicines"]:
            if isinstance(medicine, dict):
                # Ensure timing_times is a list of strings (no None values)
                if "timing_times" in medicine:
                    if medicine["timing_times"] is None:
                        medicine["timing_times"] = []
                    elif isinstance(medicine["timing_times"], list):
                        # Filter out None, empty strings, and convert to strings
                        medicine["timing_times"] = [
                            str(t).strip()
                            for t in medicine["timing_times"]
                            if t is not None and str(t).strip()
                        ]
                    else:
                        medicine["timing_times"] = []
                else:
                    medicine["timing_times"] = []
                
                # Ensure warnings is a list of strings (no None values)
                if "warnings" in medicine:
                    if medicine["warnings"] is None:
                        medicine["warnings"] = []
                    elif isinstance(medicine["warnings"], list):
                        # Filter out None, empty strings, and convert to strings
                        medicine["warnings"] = [
                            str(w).strip()
                            for w in medicine["warnings"]
                            if w is not None and str(w).strip()
                        ]
                    else:
                        medicine["warnings"] = []
                else:
                    medicine["warnings"] = []
                
                # Ensure duration_days is an integer
                if "duration_days" in medicine:
                    try:
                        medicine["duration_days"] = int(medicine["duration_days"]) if medicine["duration_days"] is not None else 0
                    except (ValueError, TypeError):
                        medicine["duration_days"] = 0
                else:
                    medicine["duration_days"] = 0
                
                # Ensure all string fields are not None
                for field in ["name", "simple_name", "reason", "dosage", "frequency"]:
                    if field not in medicine or medicine[field] is None:
                        medicine[field] = ""
                    else:
                        medicine[field] = str(medicine[field]).strip()
    
    # Ensure top-level string fields are not None
    if "narrative_explanation" not in data or data["narrative_explanation"] is None:
        data["narrative_explanation"] = ""
    if "clinical_context" not in data or data["clinical_context"] is None:
        data["clinical_context"] = ""
    
    return data


def _parse_ollama_json(raw: str) -> dict:
    """Try to parse JSON from Ollama response, stripping fences if needed."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    try:
        return json.loads(_strip_fences(raw))
    except json.JSONDecodeError:
        raise ValueError("Could not parse JSON from model response.")


@router.post("/")
async def process_document(
    file: UploadFile = File(...),
    language: str = Form(...),
):
    # ── 1. Validate file type ──────────────────────────────────────────────
    content_type = file.content_type or (
        mimetypes.guess_type(file.filename or "")[0] or ""
    )
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Only PDF, JPEG, and PNG files are accepted.",
        )

    file_bytes = await file.read()

    # ── 2. Build Ollama payload depending on file type ─────────────────────
    is_scanned = False
    user_prompt_text = ANALYSIS_USER_PROMPT.format(language=language)

    if content_type == "application/pdf":
        pdf_result = process_pdf(file_bytes)
        pages = pdf_result["pages"]
        is_scanned = pdf_result["is_scanned"]

        if not is_scanned:
            # Digital PDF — append extracted text to the prompt
            page_texts = "\n\n".join(
                f"--- PAGE {i + 1} TEXT ---\n{page['text']}"
                for i, page in enumerate(pages)
                if page["text"]
            )
            user_content = f"{user_prompt_text}\n\n{page_texts}"
        else:
            # Scanned PDF — vision only, no text to append
            user_content = user_prompt_text

        images = [page["image_base64"] for page in pages]

    else:
        # JPEG / PNG — use OCR service for potential medical documents
        image_base64, ocr_text = process_image_with_ocr(file_bytes)
        
        if ocr_text:
            # Simplified, direct instruction for medicine name extraction
            # Note: Using double braces {{}} to escape them in f-string, and explicit language insertion
            user_content = f"""{user_prompt_text}

EXTRACTED TEXT FROM DOCUMENT:
{ocr_text}

CRITICAL INSTRUCTION FOR MEDICINE NAMES:
Copy medicine names EXACTLY as they appear in the extracted text above. Do not modify spelling.
Use the image only for dosage, timing, and warnings - NOT for medicine name spelling.

USE ONLY THE OCR TEXT FROM ABOVE FOR MEDICINE NAMES. DO NOT USE THE IMAGE FOR NAME EXTRACTION.

Return ONLY valid JSON (no markdown):
{{
  "medicines": [
    {{
      "name": "exact name from extracted text",
      "simple_name": "description of medicine",
      "reason": "reason",
      "dosage": "amount",
      "frequency": "frequency ",
      "duration_days": 0,
      "timing_times": [],
      "warnings": []
    }}
  ],
  "narrative_explanation": "explanation in {language}",
  "clinical_context": "context in English",
  "was_scanned_pdf": false
}}"""
            print(f"LightOnOCR text extracted and added to prompt ({len(ocr_text)} characters)")
        else:
            # No OCR text (either not a medical document or OCR failed)
            user_content = user_prompt_text
        
        images = [image_base64]
        is_scanned = False

    # Build payload with profile context injection
    payload = build_analysis_payload(user_content, images, language)

    # ── DEBUG: Print complete prompt ───────────────────────────────────────
    print("\n" + "="*80)
    print("DEBUG: COMPLETE PROMPT SENT TO OLLAMA")
    print("="*80)
    print(f"Model: {payload.get('model')}")
    print(f"Temperature: {payload.get('options', {}).get('temperature')}")
    print("\n--- SYSTEM PROMPT ---")
    print(payload.get('messages', [{}])[0].get('content', 'N/A'))  # First 2000 chars
    print("\n--- USER PROMPT ---")
    user_msg = payload.get('messages', [{}])[1] if len(payload.get('messages', [])) > 1 else {}
    print(user_msg.get('content', 'N/A'))
    print(f"\n--- IMAGES ---")
    print(f"Number of images: {len(user_msg.get('images', []))}")
    print("="*80 + "\n")

    # ── 3. Call Ollama with automatic retry on JSON parse failure ──────────
    MAX_RETRIES = 3
    data = None
    last_error = None
    
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"\n{'='*80}")
            print(f"ATTEMPT {attempt}/{MAX_RETRIES}: Calling Ollama...")
            print(f"{'='*80}\n")
            
            ollama_response = await call_ollama(payload, timeout=180)
            
            # ── 4. Extract and parse the model's reply ─────────────────────────
            raw_content: str = ollama_response.get("message", {}).get("content", "")
            
            # ── DEBUG: Print complete response ─────────────────────────────────
            print("\n" + "="*80)
            print(f"DEBUG: RESPONSE FROM OLLAMA (Attempt {attempt})")
            print("="*80)
            print(raw_content)
            print("="*80 + "\n")

            # Try to parse JSON
            try:
                data = _parse_ollama_json(raw_content)
                print(f"✓ Successfully parsed JSON on attempt {attempt}")
                break  # Success! Exit retry loop
            except ValueError as parse_error:
                last_error = parse_error
                print(f"⚠️  JSON parse failed on attempt {attempt}: {parse_error}")
                
                if attempt < MAX_RETRIES:
                    print(f"   Retrying... ({attempt + 1}/{MAX_RETRIES})")
                    # Slightly increase temperature for retry to get different output
                    payload["options"]["temperature"] = min(0.3, payload["options"]["temperature"] + 0.1)
                else:
                    print(f"❌ All {MAX_RETRIES} attempts failed")
                    
        except Exception as e:
            if attempt == MAX_RETRIES:
                raise HTTPException(
                    status_code=503,
                    detail="Could not connect to Ollama. Please make sure Ollama is running.",
                )
            print(f"⚠️  Connection error on attempt {attempt}: {e}")
            print(f"   Retrying... ({attempt + 1}/{MAX_RETRIES})")
    
    # If all retries failed, raise error
    if data is None:
        raise HTTPException(
            status_code=500,
            detail=f"The AI returned an unexpected format after {MAX_RETRIES} attempts. Please try again.",
        )
    
    # ── 4.5. Sanitize JSON data (remove null values from arrays) ───────────
    data = _sanitize_json_data(data)

    # ── 5. Language validation pass (post-processing) ──────────────────────
    # Apply language validation to user-facing fields
    if language: # Only validate if language was specified
        try:
            # Validate narrative_explanation
            if data.get("narrative_explanation"):
                data["narrative_explanation"] = await language_validation_pass(
                    data["narrative_explanation"],
                    language
                )
            
            # Validate medicine fields
            # CRITICAL: Never validate the "name" field - it must remain exactly as extracted from OCR
            if data.get("medicines"):
                for medicine in data["medicines"]:
                    # Skip "name" field - it contains exact medicine name from OCR/document
                    # Only validate user-facing translated fields
                    if medicine.get("simple_name"):
                        medicine["simple_name"] = await language_validation_pass(
                            medicine["simple_name"],
                            language
                        )
                    if medicine.get("reason"):
                        medicine["reason"] = await language_validation_pass(
                            medicine["reason"],
                            language
                        )
                    if medicine.get("frequency"):
                        medicine["frequency"] = await language_validation_pass(
                            medicine["frequency"],
                            language
                        )
                    if medicine.get("warnings"):
                        validated_warnings = []
                        for warning in medicine["warnings"]:
                            validated_warnings.append(
                                await language_validation_pass(warning, language)
                            )
                        medicine["warnings"] = validated_warnings
        except Exception as e:
            # Language validation failure should not break the flow
            print(f"Warning: Language validation pass failed: {e}")

    # ── 6. Validate against schema ─────────────────────────────────────────
    try:
        data["was_scanned_pdf"] = is_scanned   # backend sets the authoritative value
        result = AnalysisResult(**data)
    except Exception as e:
        # Log the actual error for debugging
        print(f"\n{'='*80}")
        print("ERROR: Schema validation failed")
        print(f"{'='*80}")
        print(f"Error: {str(e)}")
        print(f"\nData received:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        print(f"{'='*80}\n")
        raise HTTPException(
            status_code=500,
            detail=f"The AI returned an unexpected format: {str(e)}",
        )

    # ── 6.5. Enhance medicine timings with meal schedule ───────────────────
    try:
        # Load profile to get meal times (or use defaults if not set)
        from models.schemas import MealTimes
        profile = load_profile()
        
        # ALWAYS enhance medicine timings if medicines exist
        # The enhancement function has default fallback times (8:00, 13:00, 20:00)
        if result.medicines:
            # Use profile meal times if available, otherwise create empty MealTimes (function will use defaults)
            meal_times = profile.meal_times if (profile and profile.meal_times) else MealTimes()
            
            print(f"Enhancing medicine timings:")
            if meal_times.breakfast or meal_times.lunch or meal_times.dinner:
                print(f"  Using profile meal times:")
                print(f"    Breakfast: {meal_times.breakfast or '08:00 (default)'}")
                print(f"    Lunch: {meal_times.lunch or '13:00 (default)'}")
                print(f"    Dinner: {meal_times.dinner or '20:00 (default)'}")
            else:
                print(f"  Using default meal times: 08:00, 13:00, 20:00")
            
            medicines_list = [med.dict() for med in result.medicines]
            enhanced_medicines = enhance_medicine_timings(medicines_list, meal_times)
            
            # Update result with enhanced timings
            for i, enhanced_med in enumerate(enhanced_medicines):
                if i < len(result.medicines):
                    old_times = result.medicines[i].timing_times
                    new_times = enhanced_med.get("timing_times", [])
                    result.medicines[i].timing_times = new_times
                    print(f"  {result.medicines[i].name}: {old_times} → {new_times}")
            
            print(f"✓ Enhanced medicine timings based on meal schedule")
        else:
            print("No medicines to enhance")
    except Exception as e:
        # Timing enhancement failure should not break the flow
        print(f"❌ Medicine timing enhancement failed: {e}")
        import traceback
        traceback.print_exc()

    # ── 7. Extract and merge profile data (silent, never breaks flow) ──────
    try:
        # Make a lightweight extraction call to get conditions and allergies
        extraction_prompt = f"""You are a medical data extractor. Extract conditions and allergies from the clinical context below.

CRITICAL: You MUST return ONLY a valid JSON object. No markdown code fences, no explanations, no extra text.
Do NOT wrap the JSON in ```json or ``` markers.
Return the raw JSON object directly.

Required JSON structure:
{{
  "conditions": [],
  "simple_names": {{}},
  "allergies": []
}}

Rules:
- If you find conditions, list them in "conditions" array
- For each condition, add a simple name mapping in "simple_names" object (e.g., {{"Type 2 Diabetes": "Diabetes"}})
- If you find allergies, list them in "allergies" array
- If nothing is found, return empty arrays/objects
- Return ONLY the JSON object, nothing else

Extract from this clinical context:
{result.clinical_context}
"""
        
        extraction_payload = {
            "model": "gemma4:e4b",
            "messages": [
                {"role": "system", "content": "You are a JSON extraction tool. Return ONLY valid JSON with no markdown fences or extra text."},
                {"role": "user", "content": extraction_prompt}
            ],
            "stream": False,
            "options": {"temperature": 0.0, "num_predict": 512}
        }
        
        extraction_response = await call_ollama(extraction_payload, timeout=30)
        extraction_raw = extraction_response.get("message", {}).get("content", "")
        extraction_data = _parse_ollama_json(extraction_raw)
        
        # Load profile and merge data
        profile = load_profile()
        
        conditions_found = extraction_data.get("conditions", [])
        simple_names = extraction_data.get("simple_names", {})
        allergies_found = extraction_data.get("allergies", [])
        
        if conditions_found:
            merge_conditions_into_profile(profile, conditions_found, simple_names)
        
        if allergies_found:
            merge_allergies_into_profile(profile, allergies_found)
        
        # Add visit record
        medicine_names = [med.name for med in result.medicines]
        add_visit_to_profile(profile, conditions_found, medicine_names)
        
        # Save profile
        save_profile(profile)
        
    except Exception as e:
        # Profile update failure must never break the main flow
        # Log the error but continue
        print(f"Warning: Profile update failed: {e}")

    return result.dict()