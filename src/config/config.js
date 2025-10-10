import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Centralized configuration for the application
 * All environment variables and defaults are defined here
 */
export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },

  // LLM provider configuration
  llm: {
    defaultProvider: process.env.DEFAULT_LLM_PROVIDER || 'openai',
    defaultTemperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),
    defaultMaxTokens: parseInt(process.env.DEFAULT_MAX_TOKENS || '4000', 10),
    timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),

    // Provider-specific settings
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    },

    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
      version: process.env.ANTHROPIC_VERSION || '2023-06-01'
    }
  },

  // API configuration
  api: {
    prefix: process.env.API_PREFIX || '/api',
    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED === 'true',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10)
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.LOG_PRETTY === 'true'
  }
};

/**
 * Validates that required configuration is present
 * @throws {Error} If required configuration is missing
 */
export function validateConfig() {
  const errors = [];

  // Check if at least one LLM provider is configured
  const hasOpenAI = !!config.llm.openai.apiKey;
  const hasAnthropic = !!config.llm.anthropic.apiKey;

  if (!hasOpenAI && !hasAnthropic) {
    errors.push('At least one LLM provider API key must be configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)');
  }

  // Validate default provider
  if (config.llm.defaultProvider === 'openai' && !hasOpenAI) {
    errors.push('DEFAULT_LLM_PROVIDER is set to "openai" but OPENAI_API_KEY is not configured');
  }

  if (config.llm.defaultProvider === 'anthropic' && !hasAnthropic) {
    errors.push('DEFAULT_LLM_PROVIDER is set to "anthropic" but ANTHROPIC_API_KEY is not configured');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

/**
 * Gets configuration summary (without sensitive data)
 */
export function getConfigSummary() {
  return {
    server: {
      port: config.server.port,
      env: config.server.env,
      host: config.server.host
    },
    llm: {
      defaultProvider: config.llm.defaultProvider,
      openaiConfigured: !!config.llm.openai.apiKey,
      anthropicConfigured: !!config.llm.anthropic.apiKey
    },
    api: {
      prefix: config.api.prefix,
      rateLimitEnabled: config.api.rateLimit.enabled
    }
  };
}

export default config;
