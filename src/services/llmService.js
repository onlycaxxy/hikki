import axios from 'axios';
import { validateMap } from '../schemas/mapSchema.js';

// System prompt for map generation
const SYSTEM_PROMPT = `You are a knowledge map generator. Your task is to convert user prompts into structured knowledge maps.

Generate a JSON response with the following structure:
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Node Label",
      "x": number (0-1000),
      "y": number (0-1000),
      "type": "concept|entity|event|location|person",
      "size": number (optional, 10-50),
      "color": "hex color (optional)"
    }
  ],
  "edges": [
    {
      "id": "unique-id",
      "source": "node-id",
      "target": "node-id",
      "label": "Relationship Label",
      "type": "relationship|dependency|similarity|hierarchy",
      "weight": number (optional, 1-10)
    }
  ],
  "territories": [
    {
      "id": "unique-id",
      "name": "Territory Name",
      "nodeIds": ["node-id-1", "node-id-2"],
      "color": "hex color (optional)",
      "description": "Territory description"
    }
  ],
  "metadata": {
    "title": "Map Title",
    "description": "Map Description",
    "tags": ["tag1", "tag2"]
  }
}

Rules:
1. Create meaningful nodes representing key concepts, entities, or ideas
2. Position nodes spatially (x, y coordinates) to show relationships
3. Connect related nodes with edges
4. Group related nodes into territories (clusters/categories)
5. Use appropriate node types and edge types
6. Return ONLY valid JSON, no markdown or explanations
7. Ensure all edge source/target IDs match existing node IDs

LAYOUT STRATEGY - Force-Directed Simulation:
- Use D3-style force-directed layout principles
- Position nodes based on SEMANTIC SIMILARITY (attraction force)
  * Strongly related concepts should be closer together (100-200px apart)
  * Weakly related concepts should be further apart (300-500px apart)
- Apply REPULSION to prevent node overlap
  * Maintain minimum distance of 80-100px between any two nodes
  * Distribute nodes naturally across the 1000x1000 canvas
- Create organic clusters where related concepts naturally group
- Spread across the coordinate space (100-900 range for both x and y)
- Think of semantic similarity as the "spring strength" pulling nodes together
- Think of repulsion as the "charge" keeping nodes from overlapping

TERRITORY STRATEGY - Semantic Clustering with Thresholds:
- Use semantic similarity to detect natural concept clusters
- Territory creation rules:
  * Minimum 3 nodes required to form a territory (don't create for <3 nodes)
  * Maximum 12 nodes per territory (split large groups into sub-territories)
  * Group nodes with high semantic similarity (conceptually related)
- Territory detection approach:
  1. Analyze which nodes are semantically/conceptually related
  2. Identify clear clusters (3+ related nodes positioned near each other)
  3. Only create territories when clear groupings emerge naturally
- Territory naming (CRITICAL):
  * Give territories natural, human-friendly names like chapter titles
  * Keep names SHORT (1-3 words maximum)
  * Make them descriptive and intuitive
  * Examples:
    - ["IELTS Listening", "Practice Tests", "Audio Materials"] → "Listening Skills"
    - ["Resume", "Cover Letter", "Portfolio"] → "Application Materials"
    - ["Variables", "Functions", "Loops"] → "Programming Basics"
    - ["Sun", "Mercury", "Venus", "Earth"] → "Inner Solar System"
- Context-specific rules:
  * For learning/exam topics: Always create territories by subject/category
  * For creative/brainstorming: Only create territories if clusters are obvious
  * For process/job search: Create territories by stage (Research, Apply, Interview, etc.)
- Territory colors: Assign distinct pastel colors to help differentiate groups visually`;

class LLMService {
  constructor() {
    this.providers = {
      openai: this.callOpenAI.bind(this),
      anthropic: this.callAnthropic.bind(this)
    };
  }

  // Main entry point
  async generateMap(prompt, context = '', options = {}) {
    const provider = options.provider || process.env.DEFAULT_LLM_PROVIDER || 'openai';
    const model = options.model || this.getDefaultModel(provider);
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens || 4000;

    if (!this.providers[provider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const fullPrompt = context
      ? `Context: ${context}\n\nPrompt: ${prompt}`
      : prompt;

    try {
      const response = await this.providers[provider](fullPrompt, {
        model,
        temperature,
        maxTokens
      });

      // Extract and validate map JSON
      const mapJson = this.extractJSON(response.content);
      const validation = validateMap(mapJson);

      if (!validation.success) {
        // Try fallback parsing
        const fallbackMap = this.fallbackParser(prompt, context);
        return {
          mapJson: fallbackMap,
          provider,
          model,
          usage: response.usage,
          fallback: true
        };
      }

      return {
        mapJson: validation.data,
        provider,
        model,
        usage: response.usage
      };
    } catch (error) {
      console.error(`LLM Error [${provider}]:`, error.message);

      // Return fallback map on error
      const fallbackMap = this.fallbackParser(prompt, context);
      return {
        mapJson: fallbackMap,
        provider,
        model,
        usage: null,
        fallback: true,
        error: error.message
      };
    }
  }

  // OpenAI implementation
  async callOpenAI(prompt, options) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: options.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      }
    };
  }

  // Anthropic implementation
  async callAnthropic(prompt, options) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      content: response.data.content[0].text,
      usage: {
        promptTokens: response.data.usage.input_tokens,
        completionTokens: response.data.usage.output_tokens,
        totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens
      }
    };
  }

  // Extract JSON from response (handles markdown code blocks)
  extractJSON(content) {
    try {
      // Try parsing directly
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

  // Fallback parser when LLM returns invalid JSON
  fallbackParser(prompt, context = '') {
    const fullText = `${context} ${prompt}`.toLowerCase();
    const words = fullText.split(/\s+/).filter(w => w.length > 3);
    const uniqueWords = [...new Set(words)].slice(0, 10);

    // Generate simple map from keywords
    const nodes = uniqueWords.map((word, index) => ({
      id: `node-${index}`,
      label: word,
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      type: 'concept',
      size: 20
    }));

    // Create some edges between nodes
    const edges = [];
    for (let i = 0; i < Math.min(nodes.length - 1, 5); i++) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
        label: 'related to',
        type: 'relationship'
      });
    }

    return {
      nodes,
      edges,
      territories: [],
      metadata: {
        title: 'Generated Map',
        description: 'Fallback map generated from keywords',
        tags: ['fallback']
      }
    };
  }

  // Get default model for provider
  getDefaultModel(provider) {
    const defaults = {
      openai: 'gpt-4-turbo-preview',
      anthropic: 'claude-3-5-sonnet-20241022'
    };
    return defaults[provider] || defaults.openai;
  }

  // Check if provider is available
  isProviderAvailable(provider) {
    if (provider === 'openai') {
      return !!process.env.OPENAI_API_KEY;
    }
    if (provider === 'anthropic') {
      return !!process.env.ANTHROPIC_API_KEY;
    }
    return false;
  }

  // Get list of available providers
  getAvailableProviders() {
    return Object.keys(this.providers).filter(p => this.isProviderAvailable(p));
  }
}

export default new LLMService();
