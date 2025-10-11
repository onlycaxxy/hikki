# Character Canvas - Data Schema Documentation

## Primary JSON Storage Location

**localStorage Key:** `mvp-history`

**Primary File:** `src/composables/useState.js`

**Read/Write Operations:**
- **Save:** `saveSnapshot(name)` - Line 63
- **Load:** `loadSnapshot(index)` - Line 97
- **Auto-save:** Triggered by `generateMap()` - Line 156

---

## Complete Data Structure

The application stores data in localStorage with the following wrapper structure:

```json
{
  "mvp-history": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ts": 1728547200000,
      "name": "auto-generate",
      "data": {
        "territories": [...],
        "nodes": [...],
        "edges": [...],
        "swot": {...},
        "ts": 1728547200000,
        "name": "auto-generate"
      }
    }
  ]
}
```

---

## Core Data Objects

### 1. Node Object (Most Important - Primary Entity)

**Complete Example:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "label": "Complete user onboarding flow",
  "x": 280,
  "y": 180,
  "territoryId": "t1-550e8400-e29b-41d4-a716-446655440000",
  "note": "This includes email verification, profile setup, and tutorial walkthrough. Priority: HIGH. Blocked by API endpoint completion.",
  "status": "in-progress",
  "timestamp": 1728547200000
}
```

**Field Descriptions:**
| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | string | ✓ | Unique identifier (UUID v4) | `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"` |
| `label` | string | ✓ | Display name (shown on canvas) | `"Complete user onboarding"` |
| `x` | number | ✓ | X coordinate in world space | `280` |
| `y` | number | ✓ | Y coordinate in world space | `180` |
| `territoryId` | string\|null | ✓ | Parent territory ID (null if orphaned) | `"t1-550e..."` or `null` |
| `note` | string | ✓ | User notes (rich text, markdown-ready) | `"Priority: HIGH..."` or `""` |
| `status` | enum | ✓ | Task status | `"todo"`, `"in-progress"`, `"done"` |
| `timestamp` | number | ✓ | Creation time (Unix milliseconds) | `1728547200000` |

**Status Enum Values:**
- `"todo"` - Not started
- `"in-progress"` - Currently working on
- `"done"` - Completed

**Empty/Minimal Node Example:**
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "label": "Quick task",
  "x": 500,
  "y": 300,
  "territoryId": null,
  "note": "",
  "status": "todo",
  "timestamp": 1728547260000
}
```

---

### 2. Territory Object (Grouping Container)

**Complete Example:**
```json
{
  "id": "t1-550e8400-e29b-41d4-a716-446655440000",
  "label": "Phase 1: Research & Discovery",
  "x": 40,
  "y": 40,
  "w": 480,
  "h": 360
}
```

**Field Descriptions:**
| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | string | ✓ | Unique identifier (UUID v4, often prefixed) | `"t1-550e8400..."` |
| `label` | string | ✓ | Display name (shown at top-left of territory) | `"Phase 1: Research"` |
| `x` | number | ✓ | X coordinate of top-left corner | `40` |
| `y` | number | ✓ | Y coordinate of top-left corner | `40` |
| `w` | number | ✓ | Width in world units | `480` |
| `h` | number | ✓ | Height in world units | `360` |

**Visual Representation:**
```
(x, y) ──────────── w ────────────┐
  │                                │
  h      [Territory Content]       │
  │                                │
  └────────────────────────────────┘
```

**Multiple Territories Example:**
```json
[
  {
    "id": "t1-550e8400-e29b-41d4-a716-446655440000",
    "label": "Backend Development",
    "x": 100,
    "y": 100,
    "w": 400,
    "h": 300
  },
  {
    "id": "t2-660f9511-f39c-52e5-b827-557766551111",
    "label": "Frontend Development",
    "x": 550,
    "y": 100,
    "w": 400,
    "h": 300
  },
  {
    "id": "t3-770g0622-g40d-63f6-c938-668877662222",
    "label": "DevOps & Infrastructure",
    "x": 100,
    "y": 450,
    "w": 850,
    "h": 250
  }
]
```

---

### 3. Edge Object (Connection/Relationship)

**Complete Example:**
```json
{
  "id": "e1-770a1533-h51e-74g7-d049-779988773333",
  "source": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "target": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

**Field Descriptions:**
| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | string | ✓ | Unique identifier (UUID v4, often prefixed) | `"e1-770a1533..."` |
| `source` | string | ✓ | Source node ID (from node.id) | `"a1b2c3d4-e5f6..."` |
| `target` | string | ✓ | Target node ID (from node.id) | `"b2c3d4e5-f6a7..."` |

**Visual Representation:**
```
[Source Node] ──────> [Target Node]
     (id: a1b2c3d4...)      (id: b2c3d4e5...)
```

**Complex Edge Relationships:**
```json
[
  {
    "id": "e1-edge-001",
    "source": "node-001",
    "target": "node-002"
  },
  {
    "id": "e2-edge-002",
    "source": "node-002",
    "target": "node-003"
  },
  {
    "id": "e3-edge-003",
    "source": "node-001",
    "target": "node-003"
  }
]
```

This creates:
```
node-001 ──> node-002 ──> node-003
    └──────────────────────┘
```

---

### 4. SWOT Object (Analysis Data)

**Complete Example:**
```json
{
  "strengths": "Strong technical team with 10+ years experience. Established customer base of 50K+ users. Robust infrastructure with 99.9% uptime.",
  "weaknesses": "Limited marketing budget. Small sales team (only 3 people). Outdated mobile app UI.",
  "opportunities": "Growing market demand in APAC region. Potential partnership with Microsoft. New AI features could differentiate us.",
  "threats": "Two major competitors launching similar products Q4. Economic downturn affecting B2B spending. Regulatory changes in EU market."
}
```

**Field Descriptions:**
| Field | Type | Required | Description | Character Limit |
|-------|------|----------|-------------|-----------------|
| `strengths` | string | ✓ | Internal positive factors | Unlimited (recommend 500 chars) |
| `weaknesses` | string | ✓ | Internal negative factors | Unlimited (recommend 500 chars) |
| `opportunities` | string | ✓ | External positive factors | Unlimited (recommend 500 chars) |
| `threats` | string | ✓ | External negative factors | Unlimited (recommend 500 chars) |

**Empty SWOT Example:**
```json
{
  "strengths": "",
  "weaknesses": "",
  "opportunities": "",
  "threats": ""
}
```

**Partial SWOT Example:**
```json
{
  "strengths": "Good listening skills",
  "weaknesses": "Timing in writing",
  "opportunities": "",
  "threats": ""
}
```

---

## Complete Snapshot Example

This is what gets saved to `localStorage.getItem('mvp-history')`:

```json
[
  {
    "id": "snapshot-1728547200-001",
    "ts": 1728547200000,
    "name": "Initial project planning",
    "data": {
      "territories": [
        {
          "id": "t1-territory-backend",
          "label": "Backend Development",
          "x": 100,
          "y": 100,
          "w": 400,
          "h": 300
        },
        {
          "id": "t2-territory-frontend",
          "label": "Frontend Development",
          "x": 550,
          "y": 100,
          "w": 400,
          "h": 300
        }
      ],
      "nodes": [
        {
          "id": "n1-node-api-design",
          "label": "Design REST API",
          "x": 250,
          "y": 180,
          "territoryId": "t1-territory-backend",
          "note": "Focus on RESTful principles. Include versioning strategy. Document with OpenAPI 3.0 spec.",
          "status": "done",
          "timestamp": 1728540000000
        },
        {
          "id": "n2-node-db-schema",
          "label": "Database schema design",
          "x": 350,
          "y": 250,
          "territoryId": "t1-territory-backend",
          "note": "PostgreSQL. Use migrations. Consider indexing strategy for search queries.",
          "status": "in-progress",
          "timestamp": 1728543600000
        },
        {
          "id": "n3-node-ui-mockups",
          "label": "Create UI mockups",
          "x": 700,
          "y": 180,
          "territoryId": "t2-territory-frontend",
          "note": "Use Figma. Mobile-first approach. Get stakeholder approval before coding.",
          "status": "todo",
          "timestamp": 1728547200000
        },
        {
          "id": "n4-node-orphan",
          "label": "Research competitors",
          "x": 1000,
          "y": 500,
          "territoryId": null,
          "note": "Analyze top 5 competitors. Create comparison matrix. Focus on feature gaps.",
          "status": "done",
          "timestamp": 1728536400000
        }
      ],
      "edges": [
        {
          "id": "e1-api-to-db",
          "source": "n1-node-api-design",
          "target": "n2-node-db-schema"
        },
        {
          "id": "e2-api-to-ui",
          "source": "n1-node-api-design",
          "target": "n3-node-ui-mockups"
        }
      ],
      "swot": {
        "strengths": "Experienced team. Clear product vision. Strong technical foundation.",
        "weaknesses": "Tight deadline. Limited budget. Small QA team.",
        "opportunities": "Growing market. Early mover advantage. Potential for partnerships.",
        "threats": "Established competitors. Changing regulations. Technology obsolescence."
      },
      "ts": 1728547200000,
      "name": "Initial project planning"
    }
  },
  {
    "id": "snapshot-1728633600-002",
    "ts": 1728633600000,
    "name": "Week 2 progress",
    "data": {
      "territories": [
        {
          "id": "t1-territory-backend",
          "label": "Backend Development",
          "x": 100,
          "y": 100,
          "w": 400,
          "h": 300
        },
        {
          "id": "t2-territory-frontend",
          "label": "Frontend Development",
          "x": 550,
          "y": 100,
          "w": 400,
          "h": 300
        },
        {
          "id": "t3-territory-testing",
          "label": "Testing & QA",
          "x": 100,
          "y": 450,
          "w": 850,
          "h": 200
        }
      ],
      "nodes": [
        {
          "id": "n1-node-api-design",
          "label": "Design REST API",
          "x": 250,
          "y": 180,
          "territoryId": "t1-territory-backend",
          "note": "✓ Completed. OpenAPI spec reviewed and approved.",
          "status": "done",
          "timestamp": 1728540000000
        },
        {
          "id": "n2-node-db-schema",
          "label": "Database schema design",
          "x": 350,
          "y": 250,
          "territoryId": "t1-territory-backend",
          "note": "✓ Completed. Migrations created. Indexed user_id and created_at.",
          "status": "done",
          "timestamp": 1728543600000
        },
        {
          "id": "n3-node-ui-mockups",
          "label": "Create UI mockups",
          "x": 700,
          "y": 180,
          "territoryId": "t2-territory-frontend",
          "note": "In progress. 8 of 12 screens done. Stakeholder review scheduled Friday.",
          "status": "in-progress",
          "timestamp": 1728547200000
        },
        {
          "id": "n5-node-testing",
          "label": "Write integration tests",
          "x": 500,
          "y": 530,
          "territoryId": "t3-territory-testing",
          "note": "Needs API endpoints to be deployed first. Planning test scenarios.",
          "status": "todo",
          "timestamp": 1728630000000
        }
      ],
      "edges": [
        {
          "id": "e1-api-to-db",
          "source": "n1-node-api-design",
          "target": "n2-node-db-schema"
        },
        {
          "id": "e2-api-to-ui",
          "source": "n1-node-api-design",
          "target": "n3-node-ui-mockups"
        },
        {
          "id": "e3-db-to-testing",
          "source": "n2-node-db-schema",
          "target": "n5-node-testing"
        }
      ],
      "swot": {
        "strengths": "Experienced team. Clear product vision. Strong technical foundation. API design completed ahead of schedule.",
        "weaknesses": "Tight deadline. Limited budget. Small QA team.",
        "opportunities": "Growing market. Early mover advantage. Potential for partnerships.",
        "threats": "Established competitors. Changing regulations. Technology obsolescence."
      },
      "ts": 1728633600000,
      "name": "Week 2 progress"
    }
  }
]
```

---

## Data Relationships

```
Snapshot (localStorage)
  └─ data
      ├─ territories[]
      │   └─ Territory {id, label, x, y, w, h}
      │
      ├─ nodes[]
      │   └─ Node {id, label, x, y, territoryId, note, status, timestamp}
      │       └─ territoryId ──references──> Territory.id
      │
      ├─ edges[]
      │   └─ Edge {id, source, target}
      │       ├─ source ──references──> Node.id
      │       └─ target ──references──> Node.id
      │
      └─ swot {strengths, weaknesses, opportunities, threats}
```

---

## ID Generation Pattern

All IDs use UUID v4 (RFC 4122):

```javascript
// Generate new ID
const id = crypto.randomUUID();
// Example: "550e8400-e29b-41d4-a716-446655440000"

// Common prefixes (optional, for debugging):
// Territories: "t1-", "t2-", "t3-", ...
// Nodes: "n1-", "n2-", "n3-", ... or no prefix
// Edges: "e1-", "e2-", "e3-", ...
```

---

## Validation Rules

### Node Validation
```javascript
const validateNode = (node) => {
  return node.id &&
         typeof node.label === 'string' &&
         node.label.trim().length > 0 &&
         typeof node.x === 'number' &&
         typeof node.y === 'number' &&
         (node.territoryId === null || typeof node.territoryId === 'string') &&
         typeof node.note === 'string' &&
         ['todo', 'in-progress', 'done'].includes(node.status) &&
         typeof node.timestamp === 'number';
};
```

### Territory Validation
```javascript
const validateTerritory = (territory) => {
  return territory.id &&
         typeof territory.label === 'string' &&
         territory.label.trim().length > 0 &&
         typeof territory.x === 'number' &&
         typeof territory.y === 'number' &&
         typeof territory.w === 'number' && territory.w > 0 &&
         typeof territory.h === 'number' && territory.h > 0;
};
```

### Edge Validation
```javascript
const validateEdge = (edge, nodes) => {
  const sourceExists = nodes.some(n => n.id === edge.source);
  const targetExists = nodes.some(n => n.id === edge.target);

  return edge.id &&
         typeof edge.source === 'string' &&
         typeof edge.target === 'string' &&
         sourceExists &&
         targetExists &&
         edge.source !== edge.target; // Prevent self-loops
};
```

---

## Migration & Versioning

If you need to add new fields in the future:

### Adding Optional Field to Node
```javascript
// Old format (still valid)
{
  "id": "...",
  "label": "...",
  // ... existing fields
}

// New format (with optional fields)
{
  "id": "...",
  "label": "...",
  // ... existing fields
  "priority": "high",          // NEW: optional
  "assignee": "john@example",  // NEW: optional
  "tags": ["bug", "urgent"]    // NEW: optional
}

// Migration function
const migrateNode = (node) => ({
  ...node,
  priority: node.priority || "medium",
  assignee: node.assignee || null,
  tags: node.tags || []
});
```

---

## Export Format

For external integrations, use this standardized export:

```json
{
  "version": "1.0.0",
  "exported": "2024-10-10T08:30:00.000Z",
  "application": "character-canvas",
  "data": {
    "territories": [...],
    "nodes": [...],
    "edges": [...],
    "swot": {...}
  },
  "metadata": {
    "nodeCount": 15,
    "territoryCount": 3,
    "edgeCount": 8,
    "completionRate": "33.3%"
  }
}
```

---

## Usage in Code

```javascript
// Import data access
import { useState } from './composables/useState.js';

const { nodes, territories, edges, swot, saveSnapshot, loadSnapshot } = useState();

// Create a complete node
nodes.push({
  id: crypto.randomUUID(),
  label: "My Task",
  x: 100,
  y: 200,
  territoryId: territories[0]?.id || null,
  note: "Task description",
  status: "todo",
  timestamp: Date.now()
});

// Save to localStorage
saveSnapshot("my-checkpoint");

// Load from localStorage
loadSnapshot(0); // Load first snapshot
```

---

## Summary

**Primary Data Storage:** `localStorage['mvp-history']`

**Core Objects (in order of importance):**
1. **Node** - Tasks/items (8 fields)
2. **Territory** - Grouping areas (6 fields)
3. **Edge** - Connections (3 fields)
4. **SWOT** - Analysis data (4 fields)

**Key Functions:**
- `saveSnapshot(name)` - Saves complete state
- `loadSnapshot(index)` - Restores saved state
- `generateMap()` - Creates demo data

**All operations in:** `src/composables/useState.js`
