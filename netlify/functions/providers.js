/**
 * Netlify Serverless Function: Provider Status API
 * Handles GET /api/providers requests
 */

export async function handler(event, context) {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Check which providers are configured
  const available = [];

  if (process.env.OPENAI_API_KEY) {
    available.push('openai');
  }

  if (process.env.ANTHROPIC_API_KEY) {
    available.push('anthropic');
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        available,
        supported: ['openai', 'anthropic'],
        default: process.env.DEFAULT_LLM_PROVIDER || 'openai'
      }
    })
  };
}
