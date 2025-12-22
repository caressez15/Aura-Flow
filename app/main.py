"""
AuraFlow Backend API Server

This module serves as the main entry point for the FastAPI application.
It orchestrates the generation pipeline by:
1. Processing user input via an external LLM (Moonshot/Kimi) to derive creative prompts.
2. Invoking the local Image Generation service (Stable Diffusion).
3. Invoking the local Audio Generation service (MusicGen).
4. Managing memory resources (specifically for Apple Silicon/MPS) and returning Base64 assets.
"""

import os
import json
import base64
import io
import gc
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import scipy.io.wavfile

# Import local generation services
from app.services.video_gen import generate_image 
from app.services.audio_gen import generate_music

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    use_audio: bool = True
    use_video: bool = True
    duration: int = 30

def cleanup_memory():
    """
    Forces garbage collection and clears MPS (Metal Performance Shaders) cache.
    Crucial for preventing memory overflows on macOS devices.
    """
    if torch.backends.mps.is_available():
        torch.mps.empty_cache()
    gc.collect()

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    api_key = os.environ.get("MOONSHOT_API_KEY")
    print(f"Request received: '{request.message}' | Audio: {request.use_audio} | Video: {request.use_video}")
    
    # 1. LLM Analysis (Prompt Engineering)
    analysis_result = {}
    if api_key:
        try:
            # Instruct the LLM to act as a Director and output strictly JSON
            system_prompt = (
                "You are an AIGC Director. "
                "Return only pure JSON: {'audio_prompt': 'English music prompt', 'video_prompt': 'English visual prompt'}."
            )
            
            response = requests.post(
                "https://api.moonshot.cn/v1/chat/completions",
                headers={
                    "Content-Type": "application/json", 
                    "Authorization": f"Bearer {api_key}"
                },
                json={
                    "model": "moonshot-v1-8k",
                    "messages": [
                        {"role": "system", "content": system_prompt}, 
                        {"role": "user", "content": request.message}
                    ],
                    "temperature": 0.3
                }
            )
            
            # Parse response
            content = response.json()['choices'][0]['message']['content']
            clean_content = content.replace("```json", "").replace("```", "").strip()
            analysis_result = json.loads(clean_content)
            
        except Exception as e:
            print(f"LLM Error: {e}")
            # Fallback values if LLM fails
            analysis_result = {"audio_prompt": "cinematic music", "video_prompt": "cinematic view"}
    else:
        # Fallback if no API Key is provided
        analysis_result = {"audio_prompt": "lofi hip hop", "video_prompt": "cyberpunk city"}

    # 2. Visual Generation (Stable Diffusion)
    video_base64 = None
    if request.use_video:
        try:
            print(">>> Generating Image (Stable Diffusion)...")
            pil_image = generate_image(analysis_result.get("video_prompt"))
            
            # Convert PIL image to Base64 string
            buffered = io.BytesIO()
            pil_image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
            video_base64 = f"data:image/png;base64,{img_str}"
            
            # Release memory immediately
            del pil_image 
            cleanup_memory()
            
        except Exception as e:
            print(f"Visual Generation Failed: {e}")

    # 3. Audio Generation (MusicGen)
    audio_base64 = None
    if request.use_audio:
        try:
            print(">>> Generating Music (MusicGen)...")
            prompt = analysis_result.get("audio_prompt", "music")
            duration = request.duration
            
            # Invoke the audio model
            rate, data = generate_music(prompt, duration)
            
            # Convert Numpy array to WAV bytes
            wav_buffer = io.BytesIO()
            scipy.io.wavfile.write(wav_buffer, rate=rate, data=data)
            
            # Convert to Base64 string
            wav_b64 = base64.b64encode(wav_buffer.getvalue()).decode("utf-8")
            audio_base64 = f"data:audio/wav;base64,{wav_b64}"
            
            cleanup_memory()
            
        except Exception as e:
            print(f"Audio Generation Failed: {e}")

    return {
        "analysis": analysis_result,
        "image_url": video_base64,
        "audio_url": audio_base64
    }