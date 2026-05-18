import base64
import io

import pdfplumber
from pdf2image import convert_from_bytes


def process_pdf(pdf_bytes: bytes, max_pages: int = 5) -> dict:
    """
    Adaptive PDF processor.

    Returns:
        {
            "pages": [{"text": str, "image_base64": str}],  # one entry per page
            "total_pages": int,
            "is_scanned": bool   # True if no text was extracted from any page
        }

    Strategy:
    - Always rasterise every page to JPEG (needed for Gemma 4 vision).
    - Also attempt text extraction via pdfplumber.
    - If any text is found → digital PDF; pass both text and images to Ollama.
    - If no text anywhere  → scanned PDF; pass images only to Ollama.
    """
    result_pages = []
    any_text_found = False

    # Step 1: Extract text from each page
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        total_pages = len(pdf.pages)
        pages_to_process = pdf.pages[:max_pages]
        for page in pages_to_process:
            text = (page.extract_text() or "").strip()
            if text:
                any_text_found = True
            result_pages.append({"text": text, "image_base64": None})

    # Step 2: Always rasterise pages to JPEG
    images = convert_from_bytes(
        pdf_bytes,
        dpi=200,
        first_page=1,
        last_page=min(total_pages, max_pages),
        fmt="jpeg",
    )
    for i, img in enumerate(images):
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=88)
        result_pages[i]["image_base64"] = base64.b64encode(buffer.getvalue()).decode(
            "utf-8"
        )

    return {
        "pages": result_pages,
        "total_pages": total_pages,
        "is_scanned": not any_text_found,
    }