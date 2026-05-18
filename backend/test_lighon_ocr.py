#!/usr/bin/env python3
"""
Simple test script for LightOnOCR model.
Tests OCR extraction on medical document images.
To Test the performance of LightOnOCR model for a single medical image

Usage:
    python test_lighton_ocr.py <image_path>
"""

import sys
import os
import torch
from PIL import Image
from transformers import LightOnOcrForConditionalGeneration, LightOnOcrProcessor

# Model cache directory (same as service)
MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), "model_cache", "lightonocr")
os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

# Check command line arguments
if len(sys.argv) < 2:
    print("Usage: python test_lighton_ocr.py <image_path>")
    print("\nExample:")
    print("  python test_lighton_ocr.py prescription.jpg")
    sys.exit(1)

image_path = sys.argv[1]

# Check if file exists
if not os.path.exists(image_path):
    print(f"Error: File not found: {image_path}")
    sys.exit(1)

print("=" * 80)
print("LightOnOCR Test Script")
print("=" * 80)
print(f"Image: {image_path}")
print()

# Device setup (following official implementation)
device = "cpu"
dtype = torch.float32

print(f"Device: {device}")
print(f"Data type: {dtype}")
print(f"Cache directory: {MODEL_CACHE_DIR}")
print()

# Load model + processor
print("Loading model...")
model = LightOnOcrForConditionalGeneration.from_pretrained(
    "lightonai/LightOnOCR-2-1B",
    torch_dtype=dtype,
    cache_dir=MODEL_CACHE_DIR
).to(device)

processor = LightOnOcrProcessor.from_pretrained(
    "lightonai/LightOnOCR-2-1B",
    cache_dir=MODEL_CACHE_DIR
)
print("✓ Model loaded")
print()

# Load image
print("Loading image...")
image = Image.open(image_path).convert("RGB")
print(f"✓ Image loaded: {image.size[0]} x {image.size[1]} pixels")
print()

# Create conversation
conversation = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image": image}
        ]
    }
]

# Process inputs
print("Processing inputs...")
inputs = processor.apply_chat_template(
    conversation,
    add_generation_prompt=True,
    tokenize=True,
    return_dict=True,
    return_tensors="pt",
)

# Move tensors to device
inputs = {
    k: v.to(device=device, dtype=dtype) if v.is_floating_point()
    else v.to(device)
    for k, v in inputs.items()
}
print("✓ Inputs prepared")
print()

# Generate output
print("Extracting text (this may take a moment)...")
with torch.no_grad():  # Important: disable gradients for inference
    output_ids = model.generate(
        **inputs,
        max_new_tokens=3096  # Reduced to prevent repetition
    )

generated_ids = output_ids[0, inputs["input_ids"].shape[1]:]

output_text = processor.decode(
    generated_ids,
    skip_special_tokens=True
)

print("✓ Extraction complete")
print()
print("=" * 80)
print("EXTRACTED TEXT")
print("=" * 80)
print()
print(output_text)
print()
print("=" * 80)
print(f"Total characters: {len(output_text)}")
print(f"Total lines: {len(output_text.splitlines())}")
print(f"Total words (approx): {len(output_text.split())}")
print("=" * 80)

# Save to file
output_file = f"{os.path.splitext(os.path.basename(image_path))[0]}_ocr_output.txt"
with open(output_file, "w", encoding="utf-8") as f:
    f.write(output_text)
print(f"\n✓ Results saved to: {output_file}")


