import torch
import torchaudio
import os
import tempfile
from typing import Optional
from transformers import AutoModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Language code mapping for Indic Conformer model
INDIC_LANGUAGE_CODES = {
    'assamese': 'as',
    'bengali': 'bn',
    'gujarati': 'gu',
    'hindi': 'hi',
    'kannada': 'kn',
    'malayalam': 'ml',
    'marathi': 'mr',
    'nepali': 'ne',
    'punjabi': 'pa',
    'tamil': 'ta',
    'telugu': 'te',
}

class STTService:
    """Speech-to-Text service using Indic Conformer model for Indian languages."""
    
    def __init__(self):
        self.model: Optional[AutoModel] = None
        self.model_loaded = False
    
    def _load_model(self):
        """Lazy load the Indic Conformer model."""
        if not self.model_loaded:
            print("Loading Indic Conformer model...")
            try:
                # Get HuggingFace token from environment
                hf_token = os.getenv("HUGGINGFACE_TOKEN")
                
                # Try to load from local path first (if model was downloaded manually)
                local_model_path = os.getenv("INDIC_CONFORMER_PATH")
                
                if local_model_path and os.path.exists(local_model_path):
                    print(f"Loading model from local path: {local_model_path}")
                    self.model = AutoModel.from_pretrained(
                        local_model_path,
                        trust_remote_code=True,
                        local_files_only=True
                    )
                else:
                    # Load from HuggingFace with token
                    print("Loading model from HuggingFace...")
                    if not hf_token:
                        raise ValueError(
                            "HUGGINGFACE_TOKEN not found in environment. "
                            "Please set it in your .env file or download the model locally. "
                            "See STT_SETUP.md for instructions."
                        )
                    
                    self.model = AutoModel.from_pretrained(
                        "ai4bharat/indic-conformer-600m-multilingual",
                        trust_remote_code=True,
                        cache_dir=os.getenv("HF_CACHE_DIR", None),
                        token=hf_token
                    )
                
                self.model_loaded = True
                print("Indic Conformer model loaded successfully")
            except Exception as e:
                print(f"Error loading Indic Conformer model: {e}")
                print("\nTroubleshooting:")
                print("1. Request access to the model at: https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual")
                print("2. Set HUGGINGFACE_TOKEN in your .env file")
                print("3. Or download the model locally and set INDIC_CONFORMER_PATH")
                raise
    
    def transcribe_audio(self, audio_data: bytes, language: str) -> str:
        """
        Transcribe audio data to text using the Indic Conformer model.
        
        Args:
            audio_data: Raw audio bytes (WAV format)
            language: Language name (e.g., 'hindi', 'kannada')
        
        Returns:
            Transcribed text
        """
        # Load model if not already loaded
        self._load_model()
        
        # Get language code
        lang_code = INDIC_LANGUAGE_CODES.get(language.lower())
        if not lang_code:
            raise ValueError(f"Unsupported language for Indic STT: {language}")
        
        # Save audio data to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
        
        try:
            # Load audio file
            wav, sr = torchaudio.load(temp_path)
            
            # Convert to mono if stereo
            if wav.shape[0] > 1:
                wav = torch.mean(wav, dim=0, keepdim=True)
            
            # Resample to 16kHz if needed (expected by the model)
            target_sample_rate = 16000
            if sr != target_sample_rate:
                resampler = torchaudio.transforms.Resample(
                    orig_freq=sr,
                    new_freq=target_sample_rate
                )
                wav = resampler(wav)
            
            # Perform ASR with RNNT decoding
            transcription = self.model(wav, lang_code, "rnnt")
            
            return transcription
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)


# Global instance
_stt_service: Optional[STTService] = None


def get_stt_service() -> STTService:
    """Get or create the global STT service instance."""
    global _stt_service
    if _stt_service is None:
        _stt_service = STTService()
    return _stt_service


