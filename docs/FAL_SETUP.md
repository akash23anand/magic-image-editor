FAL.ai Integration

- Env: create `.env` with `FAL_Key=<your-key>` (already added in repo for your convenience in local dev).
- Vite exposes `FAL_Key` via `envPrefix` so the frontend can authenticate the FAL client SDK during development.
- Models are mapped per tool via IDs in `src/services/ModelConfigService.ts` using the `fal-*` entries.
- Client code calls `@fal-ai/client` from `src/services/FALService.ts` for:
  - Background generation: `fal-ai/flux-pro/v1.1`
  - Inpainting (eraser): `fal-ai/flux-pro/inpainting`
  - Edit: `fal-ai/instruct-pix2pix` (adjust per FAL catalog)
  - Outpaint: `fal-ai/flux-pro/outpainting` (adjust per FAL catalog)

Notes

- You can customize model slugs by calling `falService.setModels(...)` or updating defaults in `FALService.ts`.
- To install the SDK: `npm i @fal-ai/client`.
- If you prefer not to expose the key client-side, implement server-side proxies and remove `FAL_` from `vite.config.ts` envPrefix.
