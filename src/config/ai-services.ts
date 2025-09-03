/**
 * AI Services Configuration
 * Allows switching between different backend providers
 */

export interface AIServiceConfig {
  stableDiffusion: {
    endpoint: string;
    apiKey?: string;
    enabled: boolean;
  };
  useBackend: 'webui' | 'fastapi' | 'none';
}

export const aiConfig: AIServiceConfig = {
  stableDiffusion: {
    endpoint: 'http://localhost:7860',  // WebUI default
    enabled: true,
  },
  useBackend: 'webui', // Change to 'fastapi' or 'none' as needed
};

// Helper to get the correct endpoint
export function getStableDiffusionEndpoint(): string {
  switch (aiConfig.useBackend) {
    case 'webui':
      return aiConfig.stableDiffusion.endpoint;
    case 'fastapi':
      return 'http://localhost:8000';
    case 'none':
      return '';
    default:
      return aiConfig.stableDiffusion.endpoint;
  }
}

// Check if backend is available
export async function checkBackendHealth(): Promise<boolean> {
  const endpoint = getStableDiffusionEndpoint();
  if (!endpoint || aiConfig.useBackend === 'none') {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${endpoint}/sdapi/v1/sd-models`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}