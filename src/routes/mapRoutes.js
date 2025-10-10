import express from 'express';
import llmService from '../services/llmService.js';
import { validateRequest } from '../schemas/mapSchema.js';
import { ValidationError, LLMProviderError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /api/generate
 * Main endpoint: Generate a knowledge map from a text prompt
 *
 * Request body:
 * {
 *   "prompt": "string (required)",
 *   "context": "string (optional)",
 *   "provider": "openai|anthropic (optional)",
 *   "model": "string (optional)",
 *   "temperature": number (optional, 0-2),
 *   "maxTokens": number (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": { mapJson },
 *   "metadata": { provider, model, usage, fallback }
 * }
 */
router.post('/generate', async (req, res, next) => {
  try {
    // Validate request
    const validation = validateRequest(req.body);
    if (!validation.success) {
      throw new ValidationError('Invalid request parameters', validation.error);
    }

    const { prompt, context, provider, model, temperature, maxTokens } = validation.data;

    // Check if requested provider is available
    if (provider && !llmService.isProviderAvailable(provider)) {
      throw new LLMProviderError(
        `Provider '${provider}' is not configured. Please set the appropriate API key.`,
        provider
      );
    }

    // Generate map
    const result = await llmService.generateMap(prompt, context, {
      provider,
      model,
      temperature,
      maxTokens
    });

    // Build response
    const response = {
      success: true,
      data: result.mapJson,
      metadata: {
        provider: result.provider,
        model: result.model,
        fallback: result.fallback || false
      }
    };

    // Include usage data if available
    if (result.usage) {
      response.metadata.usage = result.usage;
    }

    // Include error message if fallback was used
    if (result.error) {
      response.metadata.warning = result.error;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/providers
 * Get list of available and configured LLM providers
 */
router.get('/providers', (req, res) => {
  const available = llmService.getAvailableProviders();

  res.json({
    success: true,
    data: {
      available,
      supported: ['openai', 'anthropic'],
      default: process.env.DEFAULT_LLM_PROVIDER || 'openai'
    }
  });
});

/**
 * GET /api/health
 * Health check endpoint with provider status
 */
router.get('/health', (req, res) => {
  const availableProviders = llmService.getAvailableProviders();

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    providers: {
      available: availableProviders,
      count: availableProviders.length
    }
  });
});

/**
 * POST /api/validate
 * Validate map structure without generating
 * Useful for testing and debugging map JSON
 */
router.post('/validate', async (req, res, next) => {
  try {
    const { validateMap } = await import('../schemas/mapSchema.js');
    const validation = validateMap(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid map structure',
        details: validation.error
      });
    }

    res.json({
      success: true,
      message: 'Map structure is valid',
      data: validation.data
    });
  } catch (error) {
    next(error);
  }
});

export default router;
