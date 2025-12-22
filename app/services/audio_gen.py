"""
AuraFlow Audio Generation Module

This module handles the interaction with the Facebook MusicGen model to generate
background music based on text prompts. It includes device-agnostic loading logic
and caching mechanisms to ensure efficient inference.
"""

import torch
import scipy.io.wavfile
import numpy as np
import io
from transformers import AutoProcessor, MusicgenForConditionalGeneration

# Global cache to store the loaded model and processor
# This prevents reloading the heavy model on every request
processor = None
model = None

def load_musicgen():
    """
    Loads the MusicGen model and processor. 
    Uses a singleton pattern to return the cached model if already loaded.
    """
    global processor, model
    if model is not None:
        return processor, model

    print("Loading MusicGen model (this may take a moment)...")
    
    # 1. Device Selection
    # Prioritize CUDA (NVIDIA), then MPS (Apple Silicon), fallback to CPU
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if torch.backends.mps.is_available():
        device = "mps" 

    print(f"Audio model running on: {device}")

    # 2. Model Initialization
    # Loading the 'small' version for a balance between speed and quality
    processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
    
    model.to(device)
    return processor, model

def generate_music(prompt: str, duration: int = 10):
    """
    Generates music based on a text prompt.

    Args:
        prompt: Text description (e.g., "lofi hip hop, chill").
        duration: Target duration of the generated audio in seconds.
    
    Returns:
        tuple: (sampling_rate, audio_data_numpy_array)
    """
    # Ensure model is loaded before generation
    processor, model = load_musicgen()
    
    print(f"Start generating music: {prompt} | Duration: {duration}s")
    
    # 1. Preprocessing
    # Convert text prompt into tensors
    inputs = processor(
        text=[prompt],
        padding=True,
        return_tensors="pt",
    )
    
    # Move inputs to the same device as the model (GPU/MPS/CPU)
    inputs = {k: v.to(model.device) for k, v in inputs.items()}
    
    # 2. Token Calculation
    # MusicGen generates approximately 50 tokens per second of audio.
    # We calculate the required max tokens based on the requested duration.
    tokens_to_gen = int(duration * 50)

    # 3. Generation
    # Generate audio values using sampling
    audio_values = model.generate(
        **inputs, 
        max_new_tokens=tokens_to_gen,
        do_sample=True, 
        guidance_scale=3.0
    )
    
    # 4. Post-processing
    # Extract the raw audio data and move it back to CPU for NumPy conversion
    sampling_rate = model.config.audio_encoder.sampling_rate
    audio_data = audio_values[0, 0].cpu().numpy()
    
    return sampling_rate, audio_data