import axios from 'axios';
import { validateMap } from '../schemas/mapSchema.js';

// System prompt for map generation
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

- Territory: "Gesture" (CATEGORY - a container)
  ├─ Node: "Hand Movements" (specific item)
  ├─ Node: "Arm Position" (specific item)
  └─ Node: "Body Language" (specific item)

DO NOT confuse territories with nodes!
❌ BAD: Territory = "Eye Contact" (this is a node, too specific!)
✅ GOOD: Territory = "Face Expression", Node = "Eye Contact"

════════════════════════════════════════════════════════

STEP 1: READ USER INPUT & EXTRACT TERRITORY CATEGORIES
- Look for: "first X, then Y, after Z" → X, Y, Z are territory candidates
- Look for: "including A, B, and C" → A, B, C are territory candidates
- Extract 2-5 CATEGORY NAMES (not individual items!)
- Filter out verbs, pronouns, connectors

STEP 2: VALIDATE TERRITORIES
- Each territory must be a CONTAINER that can hold 3-10 nodes
- Ask yourself: "Can I think of specific items that belong in this category?"
- If yes ✅ → It's a territory
- If no ❌ → It's probably a node, not a territory

STEP 3: GENERATE NODES (10-30 specific items)
- For EACH territory, create 3-10 specific nodes
- Nodes are concrete concepts, tasks, skills, items
- Assign each node to its territory via nodeIds array

STEP 4: CREATE EDGES between nodes and position spatially

════════════════════════════════════════════════════════

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

CONCRETE EXAMPLE for input: "first face expression, then gesture, after that interaction"

{
  "territories": [
    {
      "id": "territory-1",
      "name": "Face Expression",
      "nodeIds": ["node-1", "node-2", "node-3"],
      "description": "Observations of facial cues"
    },
    {
      "id": "territory-2",
      "name": "Gesture",
      "nodeIds": ["node-4", "node-5", "node-6"],
      "description": "Body and hand movements"
    },
    {
      "id": "territory-3",
      "name": "Interaction",
      "nodeIds": ["node-7", "node-8", "node-9"],
      "description": "Social behavior patterns"
    }
  ],
  "nodes": [
    {"id": "node-1", "label": "Eye Contact", "x": 150, "y": 200, "type": "concept"},
    {"id": "node-2", "label": "Smile", "x": 250, "y": 200, "type": "concept"},
    {"id": "node-3", "label": "Frowning", "x": 350, "y": 200, "type": "concept"},
    {"id": "node-4", "label": "Hand Gestures", "x": 150, "y": 400, "type": "concept"},
    {"id": "node-5", "label": "Posture", "x": 250, "y": 400, "type": "concept"},
    {"id": "node-6", "label": "Arm Position", "x": 350, "y": 400, "type": "concept"},
    {"id": "node-7", "label": "Turn Taking", "x": 150, "y": 600, "type": "concept"},
    {"id": "node-8", "label": "Personal Space", "x": 250, "y": 600, "type": "concept"},
    {"id": "node-9", "label": "Conversation Flow", "x": 350, "y": 600, "type": "concept"}
  ],
  "edges": [...],
  "metadata": {...}
}

NOTE: "Face Expression", "Gesture", "Interaction" are TERRITORIES (containers)
      "Eye Contact", "Smile", "Hand Gestures" etc are NODES (specific items inside territories)

════════════════════════════════════════════════════════

Rules:
1. ALWAYS extract 2-5 territories from user's input structure FIRST (follow STEP 1-2 above)
2. Territories must be CATEGORIES (containers), NOT specific items
3. Create 10-30 nodes total (3-10 nodes per territory)
4. Assign each node to a territory via the territory's nodeIds array
5. Position nodes spatially (x, y coordinates) to show relationships
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

TERRITORY STRATEGY - EXTRACT FROM USER INPUT (NOT from general knowledge!):
⚠️ CRITICAL: Do NOT generate territories based on your knowledge of the topic.
⚠️ EXTRACT territories from the user's actual input structure and language!

Territories are NOT:
  ❌ Individual words or concepts
  ❌ Generic domain categories you know about
  ❌ Node-level details
  ❌ Generated from your knowledge base

Territories ARE:
  ✅ High-level categories MENTIONED or IMPLIED in the user's input
  ✅ Organizational themes extracted from their enumeration patterns
  ✅ Containers for 3-12 related nodes
  ✅ Named using vocabulary from the user's prompt

═══════════════════════════════════════════════════════

MANDATORY EXTRACTION WORKFLOW:

STEP 1 - Read User Input & Detect Structure:
  * Look for explicit lists: "first X, then Y, after Z"
  * Detect implicit categories: "I need to research A, calculate B, and plan C"
  * Identify sequential markers: "first... then... after that... finally"
  * Find enumeration: "including A, B, and C" or "such as X, Y, Z"

STEP 2 - Extract Category Names from User's Language:
  * Pull nouns/noun phrases that represent categories (NOT individual items)
  * Keep user's vocabulary (don't rephrase with your own terms)
  * Extract 2-5 territories (optimal: 3-4)
  * Filter out: verbs (making, doing, going), pronouns (I, we), connectors (and, then, but)

STEP 3 - Validate Territory Quality:
  * Each territory should be a CATEGORY, not a single concept
  * Can you imagine 3+ nodes fitting inside it? ✅ Good territory
  * Is it just one word or action verb? ❌ Bad territory
  * Title Case, 2-4 words, self-explanatory

═══════════════════════════════════════════════════════

EXAMPLES - What to Extract vs. What to Ignore:
❌ BAD (Word-Level Breakdown):
Input: "I want to learn Python"
Wrong: ["I", "want", "learn", "Python"] ← These are individual words!

✅ GOOD (Conceptual Categories):
Input: "I want to learn Python"
Correct: ["Python Basics", "Data Structures", "Projects"] ← Learning domains

❌ BAD (Including Action Words):
Input: "I will start by making fieldnotes, I went to observe people, first their face expression and then their gesture, after that is their interaction"
Wrong: ["prepare", "making fieldnotes", "went to observe", "first their face", "then their gesture"]

✅ GOOD (Extracted Categories):
Input: "I will start by making fieldnotes, I went to observe people, first their face expression and then their gesture, after that is their interaction"
Correct: ["Face Expression", "Gesture", "Interaction"] ← The 3 observation categories

DETECTION PATTERNS:
Structural indicators to look for:
  * Sequential: "first... then... after that... finally"
  * Enumeration: "including X, Y, and Z"
  * Categorical: "types of...", "aspects such as...", "areas: A, B, C"
  * Hierarchical: "main topics", "categories", "sections"

Content to EXTRACT:
  ✅ Domain names (e.g., "Marketing", "Research")
  ✅ Concept categories (e.g., "Technical Skills", "Soft Skills")
  ✅ Observation types (e.g., "Facial Expression", "Body Language")
  ✅ Project phases (e.g., "Planning", "Execution", "Review")

Content to IGNORE:
  ❌ Personal pronouns (I, you, we, my)
  ❌ Action verbs alone (want, will, going to)
  ❌ Filler phrases (to be honest, basically, actually)
  ❌ Connectors (and, but, or, then, after)

ADAPTIVE COMPLEXITY:
  * Simple Input → Minimal Territories
    Input: "Plan vacation"
    Output: ["Destinations", "Budget", "Activities"]

  * Detailed Input → Specific Territories
    Input: "I need to plan a vacation, including researching destinations in Europe and Asia, calculating budget for flights and hotels, and listing activities like museums and hiking"
    Output: ["Destinations", "Budget Planning", "Activities & Attractions"]

  * Structured Input → Direct Mapping
    Input: "For my thesis: literature review, methodology, data analysis, conclusion"
    Output: ["Literature Review", "Methodology", "Data Analysis", "Conclusion"]

TERRITORY CREATION RULES:
  * Minimum 2 territories required (if input suggests categories)
  * Maximum 5 territories (keep it high-level)
  * Each territory must be a conceptual container, not a single concept
  * Territory names should be descriptive and self-explanatory

TERRITORY COLORS:
  * Assign distinct pastel colors to help differentiate groups visually

EDGE STRATEGY - Adaptive Density with Classification:
- Adaptive density based on map size:
  * Small maps (<10 nodes): Rich connections - show all meaningful relationships
  * Medium maps (10-30 nodes): Moderate connections - key relationships only
  * Large maps (>30 nodes): Minimal connections - essential links to avoid clutter
- Edge types (use "type" field to classify each edge):
  1. "relationship" - Direct, explicitly mentioned connections (highest priority)
     Example: "Learn JavaScript to build web apps" → JS connects to Web Apps
  2. "hierarchy" - Parent-child, prerequisite, or contains relationships
     Example: "Data Structures" contains "Arrays", "Trees", "Graphs"
  3. "similarity" - Semantically related concepts or shared category
     Example: "Python" and "JavaScript" are both programming languages
  4. "dependency" - Temporal sequence or required before
     Example: "Study" → "Practice Test" → "Real Exam" (sequential flow)
- Edge generation priority (add in this order):
  1. First: Add all direct/explicit relationships mentioned in the prompt
  2. Second: Add hierarchical relationships (parent-child, prerequisites)
  3. Third: Add semantic similarity edges only if meaningful and map isn't too dense
  4. Fourth: Add temporal/sequential edges for process-based topics
- Edge weights (use "weight" field 1-10):
  * Strong relationship: 8-10 (direct connection, prerequisites)
  * Moderate relationship: 5-7 (related concepts, same category)
  * Weak relationship: 1-4 (loose connection, optional)
- Important: Avoid redundant edges - if A→B→C exists, don't add A→C unless critically important
- Give edges descriptive labels when the relationship type isn't obvious`;

class LLMService {
  constructor() {
    this.providers = {
      openai: this.callOpenAI.bind(this),
      anthropic: this.callAnthropic.bind(this)
    };
  }

  // Retry wrapper with exponential backoff for rate limiting
  async callWithRetry(apiCall, retries = 3, provider = 'API') {
    for (let i = 0; i < retries; i++) {
      try {
        return await apiCall();
      } catch (error) {
        const isRateLimited = error.response?.status === 429;
        const isLastAttempt = i === retries - 1;

        if (isRateLimited && !isLastAttempt) {
          const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
          console.log(`⏳ ${provider} rate limit reached. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If it's the last attempt or not a rate limit error, throw
        if (isLastAttempt) {
          if (isRateLimited) {
            throw new Error(`${provider} is currently busy. Please try again in a few moments.`);
          }
          throw error;
        }
      }
    }
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

    const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const url = `${baseURL}/chat/completions`;

    // Build request body
    const requestBody = {
      model: options.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens
    };

    // Only add response_format for real OpenAI (not Groq)
    if (!baseURL.includes('groq')) {
      requestBody.response_format = { type: 'json_object' };
    }

    // Determine provider name for logging
    const providerName = baseURL.includes('groq') ? 'Groq' : 'OpenAI';

    // Wrap the API call with retry logic
    const response = await this.callWithRetry(async () => {
      return await axios.post(
        url,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
    }, 3, providerName);

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

    // Wrap the API call with retry logic
    const response = await this.callWithRetry(async () => {
      return await axios.post(
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
    }, 3, 'Anthropic');

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
    if (provider === 'openai' && process.env.OPENAI_MODEL) {
      return process.env.OPENAI_MODEL;
    }
    if (provider === 'anthropic' && process.env.ANTHROPIC_MODEL) {
      return process.env.ANTHROPIC_MODEL;
    }

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
