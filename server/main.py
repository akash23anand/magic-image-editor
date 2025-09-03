from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import StreamingResponse
from server.local_pipelines import turbo_generate_bg, turbo_inpaint, pix2pix_edit, gligen_expand

app = FastAPI()

@app.post("/generate_bg")
async def generate_bg(image: UploadFile, prompt: str = Form("")):
    png_bytes = turbo_generate_bg(await image.read(), prompt)
    return StreamingResponse(iter([png_bytes]), media_type="image/png")

@app.post("/inpaint")
async def inpaint(image: UploadFile, mask: UploadFile, prompt: str = Form("")):
    png_bytes = turbo_inpaint(await image.read(), await mask.read(), prompt)
    return StreamingResponse(iter([png_bytes]), media_type="image/png")

@app.post("/edit")
async def edit(image: UploadFile, mask: UploadFile, prompt: str):
    png_bytes = pix2pix_edit(await image.read(), await mask.read(), prompt)
    return StreamingResponse(iter([png_bytes]), media_type="image/png")

@app.post("/expand")
async def expand(image: UploadFile, prompt: str):
    png_bytes = gligen_expand(await image.read(), prompt)
    return StreamingResponse(iter([png_bytes]), media_type="image/png")