/**
 * Netlify Serverless Function: Map Generation API
 * Handles POST /api/generate requests
 * Uses native fetch (Node 18+) - no external dependencies needed
 */

// System prompt for LLM (imported from llmService.js - keeping it inline for serverless)
const SYSTEM_PROMPT = `You are a knowledge map generator. Your task is to convert user prompts into structured knowledge maps.

🎯 CRITICAL WORKFLOW - Follow these steps IN ORDER:

════════════════════════════════════════════════════════
⚠️ UNDERSTAND THE HIERARCHY FIRST ⚠️

TERRITORIES = CONTAINERS (2-5 total)
  ↓ contain multiple
NODES = ITEMS (10-30 total)
  ↓ connected by
EDGES = RELATIONSHIPS

Example hierarchy:
- Territory: "Face Expression" (CATEGORY - a container)
  ├─ Node: "Eye Contact" (specific item)
  ├─ Node: "Smile Types" (specific item)
  ├─ Node: "Frowning" (specific item)
  └─ Node: "Raised Eyebrows" (specific item)

DO NOT confuse territories with nodes!
❌ BAD: Territory = "Eye Contact" (this is a node, too specific!)
✅ GOOD: Territory = "Face Expression", Node = "Eye Contact"

════════════════════════════════════════════════════════

Generate a JSON response with the following structure:
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Node Label",
      "x": number (0-1000),
      "y": number (0-1000),
      "type": "concept|entity|event|location|person"
    }
  ],
  "edges": [
    {
      "id": "unique-id",
      "source": "node-id",
      "target": "node-id",
      "label": "Relationship Label",
      "type": "relationship|dependency|similarity|hierarchy"
    }
  ],
  "territories": [
    {
      "id": "unique-id",
      "name": "Territory Name",
      "nodeIds": ["node-id-1", "node-id-2"],
      "description": "Territory description"
    }
  ],
  "metadata": {
    "title": "Map Title",
    "description": "Map Description"
  }
}

Rules:
1. Extract 2-5 territories from user's input structure FIRST
2. Territories must be CATEGORIES (containers), NOT specific items
3. Create 10-30 nodes total (3-10 nodes per territory)
4. Assign each node to a territory via the territory's nodeIds array
5. Position nodes spatially using force-directed layout principles
6. Return ONLY valid JSON, no markdown or explanations
7. Ensure all edge source/target IDs match existing node IDs`;

// Helper: Extract JSON from LLM response
function extractJSON(content) {
  try {
    return JSON.parse(content);
  } catch (e) {
    // Try extracting from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try finding JSON object in text
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error('No valid JSON found in response');
  }
}

// Helper: Call LLM with retry logic using native fetch
async function callLLMWithRetry(apiCall, retries = 3, provider = 'API') {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      const isRateLimited = error.status === 429;
      const isLastAttempt = i === retries - 1;

      if (isRateLimited && !isLastAttempt) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`⏳ ${provider} rate limit. Retry in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (isLastAttempt) {
        if (isRateLimited) {
          throw new Error(`${provider} is currently busy. Please try again.`);
        }
        throw error;
      }
    }
  }
}

// Call OpenAI-compatible API (including Groq) using native fetch
async function callOpenAI(prompt, model, temperature, maxTokens) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const url = `${baseURL}/chat/completions`;

  const requestBody = {
    model: model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: temperature ?? 0.7,
    max_tokens: maxTokens || 4000
  };

  // Only add response_format for real OpenAI (not Groq)
  if (!baseURL.includes('groq')) {
    requestBody.response_format = { type: 'json_object' };
  }

  const providerName = baseURL.includes('groq') ? 'Groq' : 'OpenAI';

  const responseData = await callLLMWithRetry(async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  }, 3, providerName);

  return {
    content: responseData.choices[0].message.content,
    usage: {
      promptTokens: responseData.usage.prompt_tokens,
      completionTokens: responseData.usage.completion_tokens,
      totalTokens: responseData.usage.total_tokens
    }
  };
}

// Netlify Function Handler
export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { prompt, context: userContext, provider, model, temperature, maxTokens } = body;

    if (!prompt || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Build full prompt
    const fullPrompt = userContext
      ? `Context: ${userContext}\n\nPrompt: ${prompt}`
      : prompt;

    console.log('🤖 Calling LLM...');

    // Call LLM (currently only OpenAI/Groq supported in serverless)
    const response = await callOpenAI(fullPrompt, model, temperature, maxTokens);

    console.log(`✅ LLM responded (${response.usage.totalTokens} tokens)`);

    // Extract and validate JSON
    const mapJson = extractJSON(response.content);

    // Basic validation
    if (!mapJson.nodes || !Array.isArray(mapJson.nodes)) {
      throw new Error('Invalid map structure: nodes array missing');
    }
    if (!mapJson.edges || !Array.isArray(mapJson.edges)) {
      throw new Error('Invalid map structure: edges array missing');
    }

    console.log('✓ Map validation passed');

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: mapJson,
        metadata: {
          provider: provider || 'openai',
          model: model || process.env.OPENAI_MODEL,
          usage: response.usage
        }
      })
    };

  } catch (error) {
    console.error('❌ Error:', error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Map generation failed'
      })
    };
  }
}
