# LLM Map Proxy Server

A modular Node.js proxy server that converts natural language prompts into structured knowledge maps using various LLM providers (OpenAI, Anthropic).

## Features

- **Multiple LLM Providers**: Easy switching between OpenAI and Anthropic
- **Structured Output**: Generates maps with nodes, edges, territories, and metadata
- **Robust Validation**: JSON schema validation using Zod
- **Error Handling**: Comprehensive error handling with fallback mechanisms
- **Modular Architecture**: Clean separation of concerns
- **Type Safety**: Schema-validated requests and responses

## Project Structure

```
hikki_prototype/
├── server.js                           # Main Express server
├── package.json                        # Dependencies and scripts
├── .env.example                        # Environment configuration template
├── README.md                           # Documentation
└── src/
    ├── config/
    │   └── config.js                   # Centralized configuration
    ├── middleware/
    │   └── errorHandler.js             # Error handling middleware
    ├── routes/
    │   └── mapRoutes.js                # API endpoints
    ├── schemas/
    │   └── mapSchema.js                # Zod schemas and validators
    └── services/
        └── llmService.js               # LLM abstraction layer
```

## Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Add your API keys** to `.env`:
```env
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

### Start the server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### 1. Generate Map (Main Endpoint)

**POST** `/api/generate`

Convert a natural language prompt into a structured knowledge map.

**Request Body**:
```json
{
  "prompt": "Explain the solar system",
  "context": "Focus on the inner planets",
  "provider": "openai",
  "model": "gpt-4-turbo-preview",
  "temperature": 0.7,
  "maxTokens": 4000
}
```

**Required Fields**:
- `prompt` (string): The text prompt to convert into a map

**Optional Fields**:
- `context` (string): Additional context for the prompt
- `provider` (string): `"openai"` or `"anthropic"` (defaults to env var)
- `model` (string): Specific model to use
- `temperature` (number): 0-2, controls randomness
- `maxTokens` (number): Maximum tokens in response

**Response**:
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "sun",
        "label": "Sun",
        "x": 500,
        "y": 500,
        "type": "entity",
        "size": 50,
        "color": "#FDB813"
      },
      {
        "id": "earth",
        "label": "Earth",
        "x": 700,
        "y": 500,
        "type": "entity",
        "size": 30,
        "color": "#4A90E2"
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "earth",
        "target": "sun",
        "label": "orbits",
        "type": "relationship",
        "weight": 8
      }
    ],
    "territories": [
      {
        "id": "inner-planets",
        "name": "Inner Planets",
        "nodeIds": ["mercury", "venus", "earth", "mars"],
        "color": "#FFE5B4",
        "description": "Rocky planets close to the sun"
      }
    ],
    "metadata": {
      "title": "Solar System Map",
      "description": "Overview of the solar system",
      "tags": ["astronomy", "planets"]
    }
  },
  "metadata": {
    "provider": "openai",
    "model": "gpt-4-turbo-preview",
    "fallback": false,
    "usage": {
      "promptTokens": 150,
      "completionTokens": 800,
      "totalTokens": 950
    }
  }
}
```

### 2. Get Available Providers

**GET** `/api/providers`

Get list of configured LLM providers.

**Response**:
```json
{
  "success": true,
  "data": {
    "available": ["openai", "anthropic"],
    "supported": ["openai", "anthropic"],
    "default": "openai"
  }
}
```

### 3. Health Check

**GET** `/api/health`

Check server health and provider status.

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "providers": {
    "available": ["openai"],
    "count": 1
  }
}
```

### 4. Validate Map Structure

**POST** `/api/validate`

Validate a map JSON structure without generating.

**Request Body**:
```json
{
  "nodes": [...],
  "edges": [...],
  "territories": [...],
  "metadata": {...}
}
```

**Response**:
```json
{
  "success": true,
  "message": "Map structure is valid",
  "data": { ... }
}
```

## Usage Examples

### Example 1: Basic Request (cURL)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a knowledge map about machine learning"
  }'
```

### Example 2: With Context and Provider

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain neural networks",
    "context": "Focus on deep learning architectures",
    "provider": "anthropic",
    "temperature": 0.8
  }'
```

### Example 3: JavaScript/Node.js Client

```javascript
const response = await fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Explain quantum computing',
    context: 'Include key concepts and applications',
    provider: 'openai'
  })
});

const result = await response.json();
console.log(result.data); // The generated map
```

### Example 4: Python Client

```python
import requests

response = requests.post(
    'http://localhost:3000/api/generate',
    json={
        'prompt': 'Explain blockchain technology',
        'provider': 'anthropic',
        'temperature': 0.7
    }
)

map_data = response.json()['data']
print(map_data)
```

## Map Schema

### Node Structure
```javascript
{
  id: string,              // Unique identifier
  label: string,           // Display label
  x: number,               // X coordinate (0-1000)
  y: number,               // Y coordinate (0-1000)
  type?: 'concept' | 'entity' | 'event' | 'location' | 'person',
  size?: number,           // Node size (10-50)
  color?: string,          // Hex color
  metadata?: object        // Additional data
}
```

### Edge Structure
```javascript
{
  id: string,              // Unique identifier
  source: string,          // Source node ID
  target: string,          // Target node ID
  label?: string,          // Relationship label
  type?: 'relationship' | 'dependency' | 'similarity' | 'hierarchy',
  weight?: number,         // Edge weight (1-10)
  color?: string,          // Hex color
  metadata?: object        // Additional data
}
```

### Territory Structure
```javascript
{
  id: string,              // Unique identifier
  name: string,            // Territory name
  nodeIds: string[],       // Array of node IDs
  color?: string,          // Hex color
  description?: string,    // Description
  metadata?: object        // Additional data
}
```

## Error Handling

The server includes comprehensive error handling:

- **Validation errors** (400): Invalid request body or parameters
- **Provider errors** (502): LLM provider issues
- **Configuration errors** (500): Missing API keys or config issues

**Error Response Format**:
```json
{
  "error": {
    "message": "Error description",
    "type": "ErrorType",
    "details": { ... }
  }
}
```

## Configuration

All configuration is centralized in `src/config/config.js` and controlled via environment variables in `.env`.

**Key Configuration Options**:
- `PORT`: Server port (default: 3000)
- `DEFAULT_LLM_PROVIDER`: Default provider (`openai` or `anthropic`)
- `DEFAULT_TEMPERATURE`: Default temperature (0-2)
- `DEFAULT_MAX_TOKENS`: Default max tokens
- `CORS_ORIGIN`: CORS origin (default: `*`)

## Development

### Project Architecture

The codebase follows a modular architecture:

1. **server.js**: Express server setup and initialization
2. **src/config/**: Configuration management
3. **src/routes/**: API endpoint definitions
4. **src/services/**: Business logic (LLM integration)
5. **src/schemas/**: Data validation schemas
6. **src/middleware/**: Express middleware

### Adding a New LLM Provider

To add a new provider, edit `src/services/llmService.js`:

1. Add provider method (e.g., `callNewProvider()`)
2. Register in `this.providers` object
3. Update configuration in `src/config/config.js`
4. Add API key to `.env`

## Security Notes

- **Never commit `.env` file** to version control
- **Store API keys securely** in environment variables
- **Use HTTPS** in production
- **Set appropriate CORS_ORIGIN** in production
- **Enable rate limiting** for production deployments

## License

MIT

## Support

For issues or questions, please open an issue on the repository.
