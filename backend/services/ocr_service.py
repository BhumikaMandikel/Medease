import os
import gc
import base64
import io
from typing import Optional, Tuple
from PIL import Image
import torch
from transformers import LightOnOcrForConditionalGeneration, LightOnOcrProcessor

# Model cache directory
MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "model_cache", "lightonocr")
os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

# Global variables to hold model and processor (lazy loaded)
_ocr_model = None
_ocr_processor = None


def _detect_medical_document(image_bytes: bytes) -> bool:
    """
    Quick heuristic check to determine if an image might be a prescription
    or discharge summary.
    
    Returns True if the image looks like it contains medical text/prescriptions.
    """
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Simple heuristic: check image dimensions and aspect ratio
        # Medical documents are typically portrait orientation
        width, height = image.size
        aspect_ratio = height / width if width > 0 else 0
        
        # Most prescriptions/discharge summaries are portrait (taller than wide)
        # and have reasonable dimensions
        if aspect_ratio < 1.0:  # Landscape - less likely to be prescription
            return False
        
        # If it's portrait and reasonable size, assume it might be medical
        # This is a conservative approach - we'll load OCR for most portrait images
        return True
        
    except Exception as e:
        print(f"Error in medical document detection: {e}")
        # If detection fails, assume it might be medical to be safe
        return True


def _load_ocr_model():
    """
    Lazy load the LightOnOCR model and processor.
    Uses CPU with float32 for stable inference.
    """
    global _ocr_model, _ocr_processor
    
    if _ocr_model is not None and _ocr_processor is not None:
        return _ocr_model, _ocr_processor
    
    print("Loading LightOnOCR model (this may take a moment)...")
    
    # Device setup - using CPU for stability as per test script
    device = "cpu"
    dtype = torch.float32
    
    print(f"Using device: {device}")
    print(f"Cache directory: {MODEL_CACHE_DIR}")
    
    # Load model
    _ocr_model = LightOnOcrForConditionalGeneration.from_pretrained(
        "lightonai/LightOnOCR-2-1B",
        torch_dtype=dtype,
        cache_dir=MODEL_CACHE_DIR
    ).to(device)
    
    # Load processor
    _ocr_processor = LightOnOcrProcessor.from_pretrained(
        "lightonai/LightOnOCR-2-1B",
        cache_dir=MODEL_CACHE_DIR
    )
    
    print(f"LightOnOCR model loaded successfully on {device}")
    
    return _ocr_model, _ocr_processor


def _unload_ocr_model():
    """
    Unload the OCR model and processor from memory to free up resources.
    """
    global _ocr_model, _ocr_processor
    
    if _ocr_model is not None or _ocr_processor is not None:
        print("Unloading LightOnOCR model from memory...")
        
        # Delete references
        if _ocr_model is not None:
            del _ocr_model
            _ocr_model = None
        
        if _ocr_processor is not None:
            del _ocr_processor
            _ocr_processor = None
        
        # Force garbage collection
        gc.collect()
        
        print("LightOnOCR model unloaded successfully")


def extract_text_with_ocr(image_bytes: bytes) -> Optional[str]:
    """
    Extract text from an image using LightOnOCR.
    
    This function:
    1. Checks if the image looks like a medical document
    2. If yes, loads the OCR model (lazy loading)
    3. Extracts text using LightOnOCR
    4. Immediately unloads the model to free memory
    5. Returns the extracted text
    
    Args:
        image_bytes: Raw image bytes (JPEG or PNG)
        
    Returns:
        Extracted text string, or None if OCR was not needed/failed
    """
    try:
        # Step 1: Quick check if this looks like a medical document
        if not _detect_medical_document(image_bytes):
            print("Image does not appear to be a medical document, skipping OCR")
            return None
        
        print("Image appears to be a medical document, loading OCR model...")
        
        # Step 2: Load the OCR model and processor
        model, processor = _load_ocr_model()
        
        # Step 3: Prepare the image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        print(f"Processing image of size: {image.size}")
        
        # Step 4: Create conversation format for LightOnOCR
        conversation = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image}
                ]
            }
        ]
        
        # Step 5: Process inputs using the processor
        print("Extracting text with LightOnOCR...")
        inputs = processor.apply_chat_template(
            conversation,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        )
        
        # Move tensors to device
        device = "cpu"
        dtype = torch.float32
        inputs = {
            k: v.to(device=device, dtype=dtype) if v.is_floating_point()
            else v.to(device)
            for k, v in inputs.items()
        }
        
        # Step 6: Generate output with the model
        with torch.no_grad():  # Disable gradients for inference
            output_ids = model.generate(
                **inputs,
                max_new_tokens=3096  # Reduced to prevent repetition
            )
        
        # Extract generated tokens (skip input tokens)
        generated_ids = output_ids[0, inputs["input_ids"].shape[1]:]
        
        # Step 7: Decode the output
        output_text = processor.decode(
            generated_ids,
            skip_special_tokens=True
        )
        
        print(f"OCR extraction complete. Extracted {len(output_text)} characters")
        print("Extracted text (For debugging only)")
        print("-" * 50)
        print(output_text)
        print("-" * 50)
        
        # Step 8: Immediately unload the model to free memory
        #_unload_ocr_model()
        
        return output_text.strip()
        
    except Exception as e:
        print(f"Error during OCR extraction: {e}")
        # Make sure to unload model even if there's an error
        _unload_ocr_model()
        return None


def process_image_with_ocr(image_bytes: bytes) -> Tuple[str, Optional[str]]:
    """
    Process an image file, extracting text with OCR if it's a medical document.
    
    Returns:
        Tuple of (base64_encoded_image, ocr_text)
        - base64_encoded_image: Always returned for vision model
        - ocr_text: OCR extracted text if available, None otherwise
    """
    # Always encode the image for vision model
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    
    # Try OCR extraction with LightOnOCR
    ocr_text = extract_text_with_ocr(image_bytes)
    
    return image_base64, ocr_text


