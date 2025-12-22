"""
AuraFlow Image Generation Module

This module manages the text-to-image generation pipeline using Stable Diffusion (v1.5).
It integrates custom LoRA weights to enforce the specific visual style required by 
the AuraFlow application and handles device-specific optimizations.
"""

import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
import io

# Global variable to cache the model pipeline and prevent reloading on every request
pipe = None

def load_model():
    """
    Initializes and loads the Stable Diffusion model with LoRA weights.
    Uses a singleton pattern to ensure the model is loaded only once.
    """
    global pipe
    if pipe is not None:
        return pipe

    print("Loading Stable Diffusion model...")
    
    # 1. Device and Precision Configuration
    # Select the best available hardware accelerator (CUDA for NVIDIA, MPS for Apple Silicon)
    if torch.cuda.is_available():
        device = "cuda"
        dtype = torch.float16 # Use half-precision (fp16) on GPU to save memory
    elif torch.backends.mps.is_available():
        device = "mps" 
        dtype = torch.float32 # Use standard precision (fp32) on MPS for better compatibility
    else:
        device = "cpu"
        dtype = torch.float32

    print(f"Image generation running on: {device}")

    # 2. Load Base Model
    # Using Stable Diffusion v1.5 as the foundation
    model_id = "runwayml/stable-diffusion-v1-5"
    pipe = StableDiffusionPipeline.from_pretrained(
        model_id, 
        torch_dtype=dtype,
        use_safetensors=True
    )

    # 3. Optimize Scheduler
    # Switch to DPMSolverMultistepScheduler for faster inference speeds (fewer steps required)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

    # 4. Load LoRA Weights
    # Load the specific style adapter from the hosted repository
    lora_repo = "CaresseZ/aura-flow-assets"
    lora_subfolder = "style_lora" 
    lora_filename = "adapter_model.safetensors" 
    
    try:
        print(f"Loading LoRA from: {lora_repo} (Subfolder: {lora_subfolder})")
        
        pipe.load_lora_weights(
            lora_repo, 
            weight_name=lora_filename,
            subfolder=lora_subfolder
        )
        print("LoRA weights loaded successfully.")
        
        # Optional: Adjust LoRA influence scale (0.0 - 1.0) if style is too strong/weak
        # pipe.fuse_lora(lora_scale=0.8) 
        
    except Exception as e:
        print(f"⚠️ Failed to load LoRA weights. Proceeding with base model. Error: {e}")

    # 5. Final Setup
    # Move pipeline to the selected device
    pipe = pipe.to(device)
    
    # Enable memory optimization if running on CPU
    if device == "cpu":
        pipe.enable_attention_slicing()
        
    return pipe

def generate_image(prompt: str):
    """
    Generates an image based on the provided text prompt.

    Args:
        prompt: The text description for the image generation.

    Returns:
        PIL.Image: The generated image object.
    """
    pipeline = load_model()
    
    # Standard negative prompts to improve image quality and avoid artifacts
    negative_prompt = "low quality, bad anatomy, worst quality, text, watermark, ugly, blurry, deformed"
    
    # Execute generation
    # Steps set to 25 to balance speed and quality with the DPM scheduler
    image = pipeline(
        prompt, 
        negative_prompt=negative_prompt, 
        num_inference_steps=25,
        height=512,
        width=512,
        guidance_scale=7.5 
    ).images[0]
    
    return image