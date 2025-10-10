# Usage Examples - Character Canvas

## Basic Usage Examples

### Example 1: Creating a Simple Workflow

```javascript
// In browser console or custom script
import { useState, useNodes } from './composables';

const { nodes, territories, edges } = useState();
const { quickNodeLabel, quickAddNode } = useNodes();

// Add three sequential tasks
quickNodeLabel.value = 'Research topic';
quickAddNode();

quickNodeLabel.value = 'Write draft';
quickAddNode();

quickNodeLabel.value = 'Review & publish';
quickAddNode();
```

### Example 2: Programmatically Creating a Territory

```javascript
import { useState } from './composables/useState.js';

const { territories } = useState();

// Add a new territory
territories.push({
  id: crypto.randomUUID(),
  label: 'Phase 1: Planning',
  x: 100,
  y: 100,
  w: 400,
  h: 300
});
```

### Example 3: Connecting Nodes with Edges

```javascript
import { useState } from './composables/useState.js';

const { nodes, edges } = useState();

// Assuming you have two nodes
const node1 = nodes[0];
const node2 = nodes[1];

// Create an edge connecting them
edges.push({
  id: crypto.randomUUID(),
  source: node1.id,
  target: node2.id
});
```

### Example 4: Custom Node with Territory Assignment

```javascript
import { useState, useCanvas } from './composables';

const { nodes, territories } = useState();
const { viewBox } = useCanvas();

// Find or create a territory
const territory = territories[0];

// Add a node inside the territory
nodes.push({
  id: crypto.randomUUID(),
  label: 'Task in Territory',
  x: territory.x + territory.w / 2,
  y: territory.y + territory.h / 2,
  territoryId: territory.id,
  note: 'This task belongs to the territory',
  status: 'todo',
  timestamp: Date.now()
});
```

### Example 5: Batch Node Creation

```javascript
import { useState } from './composables/useState.js';

const { nodes } = useState();

const tasks = [
  'Define requirements',
  'Design mockups',
  'Implement features',
  'Write tests',
  'Deploy to production'
];

tasks.forEach((task, index) => {
  nodes.push({
    id: crypto.randomUUID(),
    label: task,
    x: 200 + (index * 150),  // Horizontal layout
    y: 400,
    territoryId: null,
    note: '',
    status: 'todo',
    timestamp: Date.now()
  });
});
```

### Example 6: Save and Load Workflow

```javascript
import { useState } from './composables/useState.js';

const { saveSnapshot, loadSnapshot } = useState();

// Save current state
saveSnapshot('workflow-v1');

// Later, load the first snapshot
loadSnapshot(0);
```

### Example 7: Custom Zoom Behavior

```javascript
import { useCanvas } from './composables/useCanvas.js';

const { viewBox, zoomToNode } = useCanvas();

// Zoom to specific coordinates
viewBox.x = 500;
viewBox.y = 300;
viewBox.w = 800;
viewBox.h = 600;

// Or zoom to a specific node with animation
const targetNode = nodes.find(n => n.label === 'Important Task');
if (targetNode) {
  zoomToNode(targetNode, 3, 500);  // 3x zoom, 500ms duration
}
```

### Example 8: Filter Nodes by Status

```javascript
import { useState } from './composables/useState.js';

const { nodes } = useState();

// Get all completed tasks
const completedTasks = nodes.filter(n => n.status === 'done');
console.log('Completed:', completedTasks.length);

// Get tasks in progress
const inProgress = nodes.filter(n => n.status === 'in-progress');
console.log('In Progress:', inProgress.length);

// Get pending tasks
const pending = nodes.filter(n => n.status === 'todo');
console.log('Pending:', pending.length);
```

### Example 9: Custom Event Handler

```javascript
// In App.vue setup()
import { useNodes } from './composables/useNodes.js';

const { selectedNode } = useNodes();

// Watch for node selection changes
import { watch } from 'vue';

watch(selectedNode, (newNode, oldNode) => {
  if (newNode) {
    console.log('Selected node:', newNode.label);
    // Could trigger analytics, update UI, etc.
  }
});
```

### Example 10: Export to JSON

```javascript
import { useState } from './composables/useState.js';

const { nodes, territories, edges, swot } = useState();

// Create exportable data
const exportData = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  territories: [...territories],
  nodes: [...nodes],
  edges: [...edges],
  swot: { ...swot }
};

// Download as JSON
const blob = new Blob([JSON.stringify(exportData, null, 2)], {
  type: 'application/json'
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'workflow-export.json';
a.click();
URL.revokeObjectURL(url);
```

### Example 11: Import from JSON

```javascript
import { useState } from './composables/useState.js';

const { territories, nodes, edges, swot } = useState();

// Assuming you have JSON data
const importData = async (file) => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Clear existing data
    territories.splice(0);
    nodes.splice(0);
    edges.splice(0);

    // Load imported data
    data.territories?.forEach(t => territories.push(t));
    data.nodes?.forEach(n => nodes.push(n));
    data.edges?.forEach(e => edges.push(e));

    if (data.swot) {
      Object.assign(swot, data.swot);
    }

    console.log('Import successful!');
  } catch (error) {
    console.error('Import failed:', error);
  }
};

// Usage with file input
// <input type="file" @change="e => importData(e.target.files[0])" />
```

### Example 12: Real-time Node Search

```javascript
import { computed, ref } from 'vue';
import { useState } from './composables/useState.js';

const { nodes } = useState();
const searchQuery = ref('');

const filteredNodes = computed(() => {
  if (!searchQuery.value) return nodes;

  const query = searchQuery.value.toLowerCase();
  return nodes.filter(node =>
    node.label.toLowerCase().includes(query) ||
    node.note.toLowerCase().includes(query)
  );
});

// In template:
// <input v-model="searchQuery" placeholder="Search nodes..." />
// <div v-for="node in filteredNodes" :key="node.id">{{ node.label }}</div>
```

### Example 13: Keyboard Shortcuts

```javascript
// In App.vue setup()
import { onMounted, onUnmounted } from 'vue';
import { useNodes, useState } from './composables';

const { deselectNode, quickAddNode } = useNodes();
const { saveSnapshot } = useState();

const handleKeyboard = (e) => {
  // Escape to deselect
  if (e.key === 'Escape') {
    deselectNode();
  }

  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSnapshot(`manual-${Date.now()}`);
    console.log('Saved!');
  }

  // Ctrl/Cmd + N to add node
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    // Focus the quick add input
    document.querySelector('input[placeholder*="Quick add"]')?.focus();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyboard);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard);
});
```

### Example 14: Node Statistics

```javascript
import { computed } from 'vue';
import { useState } from './composables/useState.js';

const { nodes, territories } = useState();

const stats = computed(() => ({
  total: nodes.length,
  byStatus: {
    todo: nodes.filter(n => n.status === 'todo').length,
    inProgress: nodes.filter(n => n.status === 'in-progress').length,
    done: nodes.filter(n => n.status === 'done').length
  },
  byTerritory: territories.reduce((acc, t) => {
    acc[t.label] = nodes.filter(n => n.territoryId === t.id).length;
    return acc;
  }, {}),
  orphans: nodes.filter(n => !n.territoryId).length
}));

// Display in template
// <div>Total Nodes: {{ stats.total }}</div>
// <div>Completed: {{ stats.byStatus.done }}</div>
```

### Example 15: Undo/Redo System

```javascript
import { ref } from 'vue';
import { useState } from './composables/useState.js';

const { nodes, territories, edges } = useState();

// History stack
const history = ref([]);
const historyIndex = ref(-1);

const takeSnapshot = () => {
  const snapshot = {
    nodes: JSON.parse(JSON.stringify(nodes)),
    territories: JSON.parse(JSON.stringify(territories)),
    edges: JSON.parse(JSON.stringify(edges))
  };

  // Remove any forward history
  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push(snapshot);
  historyIndex.value++;

  // Limit history size
  if (history.value.length > 50) {
    history.value.shift();
    historyIndex.value--;
  }
};

const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--;
    restoreSnapshot(history.value[historyIndex.value]);
  }
};

const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++;
    restoreSnapshot(history.value[historyIndex.value]);
  }
};

const restoreSnapshot = (snapshot) => {
  nodes.splice(0);
  territories.splice(0);
  edges.splice(0);

  snapshot.nodes.forEach(n => nodes.push(n));
  snapshot.territories.forEach(t => territories.push(t));
  snapshot.edges.forEach(e => edges.push(e));
};

// Call takeSnapshot() after any modification
// Bind Ctrl+Z to undo() and Ctrl+Shift+Z to redo()
```

## Integration with External Services

### Example 16: Send Data to API

```javascript
import { useState } from './composables/useState.js';

const { nodes, territories, edges } = useState();

const syncToServer = async () => {
  try {
    const response = await fetch('https://api.example.com/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify({
        nodes: [...nodes],
        territories: [...territories],
        edges: [...edges]
      })
    });

    if (!response.ok) throw new Error('Sync failed');

    const result = await response.json();
    console.log('Synced to server:', result.id);
  } catch (error) {
    console.error('Sync error:', error);
  }
};
```

## Advanced Patterns

### Example 17: Custom Composable for Analytics

```javascript
// src/composables/useAnalytics.js
import { watch } from 'vue';
import { useState, useNodes } from './index.js';

export function useAnalytics() {
  const { nodes } = useState();
  const { selectedNode } = useNodes();

  // Track node creation
  watch(() => nodes.length, (newCount, oldCount) => {
    if (newCount > oldCount) {
      console.log('Node created, total:', newCount);
      // Send to analytics service
    }
  });

  // Track node selection
  watch(selectedNode, (node) => {
    if (node) {
      console.log('Node selected:', node.label);
      // Send to analytics service
    }
  });

  return {
    // Analytics methods
  };
}
```

### Example 18: Validation Hook

```javascript
// src/composables/useValidation.js
import { computed } from 'vue';
import { useState } from './useState.js';

export function useValidation() {
  const { nodes, edges } = useState();

  const validation = computed(() => {
    const errors = [];

    // Check for duplicate labels
    const labels = nodes.map(n => n.label);
    const duplicates = labels.filter((l, i) => labels.indexOf(l) !== i);
    if (duplicates.length) {
      errors.push(`Duplicate labels: ${duplicates.join(', ')}`);
    }

    // Check for orphaned edges
    edges.forEach(edge => {
      const sourceExists = nodes.some(n => n.id === edge.source);
      const targetExists = nodes.some(n => n.id === edge.target);

      if (!sourceExists) errors.push(`Edge ${edge.id} has invalid source`);
      if (!targetExists) errors.push(`Edge ${edge.id} has invalid target`);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  });

  return { validation };
}
```

## Testing Examples

### Example 19: Unit Test for Composable

```javascript
// tests/useNodes.test.js
import { describe, it, expect } from 'vitest';
import { useNodes } from '../src/composables/useNodes.js';

describe('useNodes', () => {
  it('should add a node with quickAddNode', () => {
    const { quickNodeLabel, quickAddNode, nodes } = useNodes();

    quickNodeLabel.value = 'Test Node';
    quickAddNode();

    expect(nodes.value.length).toBe(1);
    expect(nodes.value[0].label).toBe('Test Node');
  });

  it('should not add empty nodes', () => {
    const { quickNodeLabel, quickAddNode, nodes } = useNodes();

    quickNodeLabel.value = '';
    quickAddNode();

    expect(nodes.value.length).toBe(0);
  });
});
```

## Tips & Best Practices

1. **Always use crypto.randomUUID()** for generating IDs
2. **Maintain reactivity** by using array methods (push, splice) instead of reassignment
3. **Handle errors gracefully** with try-catch blocks
4. **Debounce expensive operations** like auto-save
5. **Use computed properties** for derived data
6. **Clean up event listeners** in onUnmounted hooks
7. **Validate user input** before creating nodes/territories
8. **Keep composables focused** on single responsibilities
9. **Document complex logic** with JSDoc comments
10. **Test edge cases** like empty arrays, null values

## Performance Optimization

### Example 20: Virtualized Node Rendering

For applications with 1000+ nodes, consider implementing virtualization:

```javascript
import { computed } from 'vue';
import { useState, useCanvas } from './composables';

const { nodes } = useState();
const { viewBox } = useCanvas();

// Only render nodes within viewport + buffer
const visibleNodes = computed(() => {
  const buffer = 200; // px
  return nodes.filter(node => {
    return node.x >= viewBox.x - buffer &&
           node.x <= viewBox.x + viewBox.w + buffer &&
           node.y >= viewBox.y - buffer &&
           node.y <= viewBox.y + viewBox.h + buffer;
  });
});

// Use visibleNodes instead of nodes in template
```

---

For more examples and documentation, see README.md
