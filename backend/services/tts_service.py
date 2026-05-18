import re
import os
import random
import torch
import numpy as np
import soundfile as sf
from typing import Optional
import snac
from transformers import AutoModelForCausalLM, AutoTokenizer

# ─────────────────────────────────────────────
# TTS Config
# ─────────────────────────────────────────────
SAMPLING_RATE = 24000
FIXED_SEED = 42  # Set to None for random voice each run

# Language mapping from frontend to TTS model format
LANGUAGE_MAP = {
    "english": "English",
    "hindi": "Hindi",
    "kannada": "Kannada",
    "bengali": "Bengali",
    "marathi": "Marathi",
    "telugu": "Telugu",
    "assamese": "Assamese",
    "gujarati": "Gujarati",
    "malayalam": "Malayalam",
    "punjabi": "Punjabi",
    "tamil": "Tamil",
    "nepali": "Nepali"
}

# Global model storage (loaded once at startup)
_tts_model = None
_tokenizer = None
_snac_model = None
_device = None
_models_loaded = False


# ─────────────────────────────────────────────
# Model Loading
# ─────────────────────────────────────────────
def load_tts_models():
    """
    Optimized loading for svara-TTS + SNAC with Mac (MPS) support.
    Models are loaded ONCE at application startup and kept in memory.
    Call this once at application startup.
    """
    global _tts_model, _tokenizer, _snac_model, _device, _models_loaded

    if _models_loaded:
        print("✓ TTS models already loaded and ready")
        return

    # Detect best available device (MPS for Mac, CUDA for NVIDIA, CPU fallback)
    if torch.backends.mps.is_available():
        _device = torch.device("mps")  # Apple Silicon GPU
        print("🍎 Using Apple Silicon GPU (MPS)")
    elif torch.cuda.is_available():
        _device = torch.device("cuda")
        print("🚀 Using NVIDIA GPU (CUDA)")
    else:
        _device = torch.device("cpu")
        print("💻 Using CPU")

    print(f"Loading TTS models on device: {_device}")

    try:
        # Load SNAC (lighter first)
        print("Loading SNAC model...")
        _snac_model = snac.SNAC.from_pretrained("hubertsiuzdak/snac_24khz")
        _snac_model = _snac_model.to(_device)
        _snac_model.eval()

        # Load TTS model (memory safe)
        print("Loading TTS model...")
        _tts_model = AutoModelForCausalLM.from_pretrained(
            "kenpath/svara-tts-v1",
            low_cpu_mem_usage=True,
            torch_dtype=torch.float32  # Use float32 for better compatibility
        )
        _tts_model = _tts_model.to(_device)
        _tts_model.eval()

        _tokenizer = AutoTokenizer.from_pretrained("kenpath/svara-tts-v1")

        _models_loaded = True
        print("✓ TTS models loaded successfully and ready for inference")
        print(f"✓ Models will remain in memory for fast generation\n")
    except Exception as e:
        print(f"❌ Error loading TTS models: {e}")
        raise


def are_models_loaded() -> bool:
    """Check if TTS models are loaded."""
    return _models_loaded


# ─────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────
def _split_text(text: str, max_chars: int = 300) -> list[str]:
    """Split long text into sentence-boundary chunks for the model."""
    sentences = re.split(r'(?<=[.!?।])\s+', text.strip())
    chunks, current = [], ""
    for sent in sentences:
        if len(current) + len(sent) <= max_chars:
            current += " " + sent
        else:
            if current:
                chunks.append(current.strip())
            current = sent
    if current:
        chunks.append(current.strip())
    return chunks


def _generate_chunk(
    text: str,
    language: str,
    gender: str = "Female",
    seed: Optional[int] = None
) -> np.ndarray:
    """Generate audio for a single chunk of text."""
    if not _models_loaded:
        raise RuntimeError("TTS models not loaded. Call load_tts_models() first.")

    voice = f"{language} ({gender})"
    formatted_text = f"<|audio|> {voice}: {text}<|eot_id|>"
    prompt = "<custom_token_3>" + formatted_text + "<custom_token_4><custom_token_5>"

    input_ids = _tokenizer(prompt, return_tensors="pt").input_ids
    start_token = torch.tensor([[128259]], dtype=torch.int64)
    end_tokens = torch.tensor([[128009, 128260, 128261, 128257]], dtype=torch.int64)
    input_ids = torch.cat([start_token, input_ids, end_tokens], dim=1).to(_device)

    # Set all random seeds for consistent voice across chunks
    if seed is not None:
        random.seed(seed)  # Python's random module
        np.random.seed(seed)  # NumPy's random
        torch.manual_seed(seed)  # PyTorch CPU
        if torch.cuda.is_available():
            torch.cuda.manual_seed(seed)  # PyTorch CUDA
            torch.cuda.manual_seed_all(seed)  # All CUDA devices
        if torch.backends.mps.is_available():
            torch.mps.manual_seed(seed)  # PyTorch MPS (Apple Silicon)

    with torch.no_grad():
        generated_ids = _tts_model.generate(
            input_ids=input_ids,
            max_new_tokens=2048,
            do_sample=True,
            temperature=0.7,
            top_p=0.95,
            repetition_penalty=1.2,
            num_return_sequences=1,
            eos_token_id=128258,
        )

    START_OF_SPEECH_TOKEN = 128257
    END_OF_SPEECH_TOKEN = 128258
    AUDIO_CODE_BASE_OFFSET = 128266
    AUDIO_CODE_MAX = AUDIO_CODE_BASE_OFFSET + (7 * 4096) - 1

    row = generated_ids[0]
    token_indices = (row == START_OF_SPEECH_TOKEN).nonzero(as_tuple=True)[0]

    if len(token_indices) == 0:
        raise ValueError("No speech tokens found in generated output")

    start_idx = token_indices[-1].item() + 1
    audio_tokens = row[start_idx:]
    audio_tokens = audio_tokens[audio_tokens != END_OF_SPEECH_TOKEN]
    audio_tokens = audio_tokens[audio_tokens != 128263]
    valid_mask = (audio_tokens >= AUDIO_CODE_BASE_OFFSET) & (audio_tokens <= AUDIO_CODE_MAX)
    audio_tokens = audio_tokens[valid_mask]

    snac_tokens = [t - AUDIO_CODE_BASE_OFFSET for t in audio_tokens.tolist()]
    snac_tokens = snac_tokens[:(len(snac_tokens) // 7) * 7]

    codes_lvl = [[] for _ in range(3)]
    offsets = [i * 4096 for i in range(7)]
    for i in range(0, len(snac_tokens), 7):
        codes_lvl[0].append(snac_tokens[i] - offsets[0])
        codes_lvl[1].append(snac_tokens[i + 1] - offsets[1])
        codes_lvl[1].append(snac_tokens[i + 4] - offsets[4])
        codes_lvl[2].append(snac_tokens[i + 2] - offsets[2])
        codes_lvl[2].append(snac_tokens[i + 3] - offsets[3])
        codes_lvl[2].append(snac_tokens[i + 5] - offsets[5])
        codes_lvl[2].append(snac_tokens[i + 6] - offsets[6])

    hierarchical_codes = [
        torch.tensor(lvl, dtype=torch.long, device=_device).unsqueeze(0)
        for lvl in codes_lvl
    ]

    with torch.no_grad():
        audio_hat = _snac_model.decode(hierarchical_codes)

    return audio_hat.detach().squeeze().to("cpu").numpy()


# ─────────────────────────────────────────────
# Public function
# ─────────────────────────────────────────────
def generate_speech(
    text: str,
    language: str,
    output_path: str,
    gender: str = "Female"
) -> str:
    """
    Convert text to speech and save as a WAV file.

    Args:
        text (str): The text to convert to speech.
        language (str): Language code ('english', 'hindi', 'kannada').
        output_path (str): Where to save the WAV file.
        gender (str): Voice gender ('Male' or 'Female'). Default: 'Female'.

    Returns:
        str: Path to the saved WAV file.
    """
    # Map frontend language to TTS model language first
    tts_language = LANGUAGE_MAP.get(language.lower())
    if not tts_language:
        supported_langs = ', '.join(LANGUAGE_MAP.keys())
        raise ValueError(f"Language '{language}' not supported. Supported languages: {supported_langs}")
    
    # Lazy load models on first use (will load once and stay in memory)
    if not _models_loaded:
        print(f"First TTS request for {tts_language} - loading models...")
        load_tts_models()

    chunks = _split_text(text)
    print(f"Generating audio for {len(chunks)} chunk(s) in {tts_language}...")

    audio_chunks = []
    for i, chunk in enumerate(chunks):
        print(f"  Chunk {i + 1}/{len(chunks)}: {chunk[:60]}...")
        try:
            audio = _generate_chunk(chunk, tts_language, gender, seed=FIXED_SEED)
            audio_chunks.append(audio)
        except Exception as e:
            print(f"  ⚠️  Skipping chunk {i + 1}: {e}")

    if not audio_chunks:
        raise RuntimeError("No audio generated — all chunks failed.")

    # Add silence between chunks
    silence = np.zeros(int(0.1 * SAMPLING_RATE))
    final_audio = np.concatenate([
        np.concatenate([chunk, silence]) for chunk in audio_chunks
    ])

    # Normalize
    max_val = np.max(np.abs(final_audio))
    if max_val > 0:
        final_audio = final_audio / max_val

    sf.write(output_path, final_audio, SAMPLING_RATE)
    print(f"✅ Saved: {output_path} ({len(final_audio) / SAMPLING_RATE:.2f}s)\n")
    return output_path

