"""
Simple FastAPI backend for Stable Diffusion
Uses Hugging Face's diffusers library for lightweight setup
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import torch
from diffusers import StableDiffusionPipeline
import io
from PIL import Image
import base64
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Simple Stable Diffusion API")

# Global pipeline variable
pipe = None

class GenerateRequest(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    num_inference_steps: int = 20
    guidance_scale: float = 7.5

class HealthResponse(BaseModel):
    status: str
    models: list

@app.on_event("startup")
async def startup_event():
    """Initialize the Stable Diffusion pipeline on startup"""
    global pipe
    try:
        logger.info("Loading Stable Diffusion pipeline...")
        pipe = StableDiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            use_auth_token=False
        )
        
        # Use CPU if no GPU available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        pipe = pipe.to(device)
        
        logger.info(f"Pipeline loaded successfully on {device}")
    except Exception as e:
        logger.error(f"Failed to load pipeline: {e}")
        pipe = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if pipe is not None else "unhealthy",
        models=["stable-diffusion-v1-5"] if pipe is not None else []
    )

@app.get("/sdapi/v1/sd-models")
async def get_models():
    """Compatibility endpoint for WebUI API"""
    return [{"title": "stable-diffusion-v1-5", "model_name": "stable-diffusion-v1-5"}]

@app.post("/sdapi/v1/txt2img")
async def generate_image(request: GenerateRequest):
    """Generate image from text prompt"""
    if pipe is None:
        raise HTTPException(status_code=503, detail="Pipeline not loaded")
    
    try:
        logger.info(f"Generating image with prompt: {request.prompt}")
        
        # Generate image
        image = pipe(
            prompt=request.prompt,
            width=request.width,
            height=request.height,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale
        ).images[0]
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return StreamingResponse(io.BytesIO(img_byte_arr.getvalue()), media_type="image/png")
        
    except Exception as e:
        logger.error(f"Error generating image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_bg")
async def generate_background(request: GenerateRequest):
    """Generate background image"""
    return await generate_image(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)