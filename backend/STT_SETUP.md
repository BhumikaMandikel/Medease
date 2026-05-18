# Speech-to-Text (STT) Setup Guide

## Overview
The MedEase application uses two different STT systems:
- **Browser Web Speech API**: For English language (built into the browser)
- **Indic Conformer Model**: For Indian languages (Hindi, Kannada, Bengali, etc.)

## HuggingFace Token Setup

The Indic Conformer model requires a HuggingFace token to download the model.

### Steps:

1. **Get a HuggingFace Token**:
   - Go to https://huggingface.co/
   - Sign up or log in
   - Go to Settings → Access Tokens
   - Create a new token with "Read" permissions

2. **Add Token to Environment**:
   - Create or edit the `.env` file in the `medease/backend/` directory
   - Add the following line:
     ```
     HUGGINGFACE_TOKEN=your_token_here
     ```

3. **Optional: Set Cache Directory**:
   - To store the model in a specific location, add:
     ```
     HF_CACHE_DIR=/path/to/cache/directory
     ```

### Example `.env` file:
```
OLLAMA_URL=http://localhost:11434
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
HF_CACHE_DIR=/Users/yourusername/.cache/huggingface
```

## Model Download

The Indic Conformer model (~600MB) will be downloaded automatically on first use. This happens when:
- A user speaks in any Indian language (Hindi, Kannada, etc.)
- The audio is sent to the backend for transcription

The model is cached locally, so subsequent uses will be much faster.

## Supported Languages

### Browser STT (English only):
- English

### Backend STT (Indic Conformer):
- Assamese (as)
- Bengali (bn)
- Gujarati (gu)
- Hindi (hi)
- Kannada (kn)
- Malayalam (ml)
- Marathi (mr)
- Nepali (ne)
- Punjabi (pa)
- Tamil (ta)
- Telugu (te)

## Installation

Make sure all dependencies are installed:
```bash
cd medease/backend
pip install -r requirements.txt
```

Key dependencies for STT:
- `transformers` - HuggingFace transformers library
- `torchaudio` - Audio processing
- `torch` - PyTorch framework
- `onnxruntime` - ONNX runtime for model inference

## Testing

To test the STT functionality:
1. Start the backend server
2. Open the frontend
3. Select a language (e.g., Hindi or Kannada)
4. Click the microphone button
5. Speak into your microphone
6. The transcribed text should appear in the input field

## Troubleshooting

### Model fails to load:
- Check that your HuggingFace token is valid
- Ensure you have internet connection for first download
- Check disk space (model is ~600MB)

### Audio not recording:
- Grant microphone permissions in your browser
- Check that your microphone is working

### Transcription errors:
- Speak clearly and at a moderate pace
- Ensure you're speaking in the selected language
- Check that the audio quality is good