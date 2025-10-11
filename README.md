# Character Canvas - Visual Workflow Platform

A visual workflow platform with chat-to-canvas conversion built with Vue 3 and modern composables architecture.

## Architecture Overview

The application follows Vue 3's Composition API pattern with a clean separation of concerns:

```
character-canvas/
├── src/
│   ├── App.vue                   # Main component (the "blueprint")
│   ├── main.js                   # Entry point (Vue initialization)
│   ├── style.css                 # Global styles
│   └── composables/              # Business logic modules
│       ├── useCanvas.js          # Viewport/Interaction Logic
│       ├── useNodes.js           # Application Data & CRUD
│       └── useState.js           # Core App State & Persistence
├── index.html                    # HTML shell (mounts Vue app)
├── vite.config.js                # Build configuration
└── package.json                  # Dependencies
```

## The Three Composables

### 1. `useCanvas.js` - Viewport & Interaction Logic

Handles canvas pan, zoom, and coordinate transformations.

**Exports:**
- `viewBox` - Reactive viewport coordinates {x, y, w, h}
- `svgToWorld(e)` - Convert mouse event to world coordinates
- `worldToScreen(node)` - Convert world coordinates to screen position
- `onPanStart/Move/End` - Pan handlers
- `onWheel` - Zoom handler
- `zoomToNode(node, scale)` - Smooth zoom to focus on a node

**Example:**
```js
import { useCanvas } from './composables/useCanvas.js';

const { viewBox, svgToWorld, onWheel } = useCanvas();

// Use in template
<svg :viewBox="\`\${viewBox.x} \${viewBox.y} \${viewBox.w} \${viewBox.h}\`" @wheel.prevent="onWheel">
```

### 2. `useNodes.js` - Application Data & CRUD

Manages nodes, selection, and drag interactions.

**Exports:**
- `selectedNode` - Currently selected node (ref)
- `quickNodeLabel` - Input for quick-add (ref)
- `nodeById(id)` - Find node by ID
- `selectNode(n)` - Select a node
- `deselectNode()` - Clear selection
- `quickAddNode()` - Add node at viewport center
- `onNodeDragStart/Move/End` - Node drag handlers

**Example:**
```js
import { useNodes } from './composables/useNodes.js';

const { selectedNode, selectNode, quickAddNode } = useNodes();

// Quick add a node
quickAddNode();

// Select a node
selectNode(myNode);
```

### 3. `useState.js` - Core App State & Persistence

Manages global state arrays and localStorage persistence.

**Exports:**
- `territories` - Reactive array of territories
- `nodes` - Reactive array of nodes
- `edges` - Reactive array of edges
- `chatInput` - Chat input ref
- `swot` - SWOT analysis object
- `saveSnapshot(name)` - Save state to localStorage
- `loadSnapshot(index)` - Load state from localStorage
- `runAnalysis()` - Run SWOT analysis (stub)
- `generateMap()` - Generate demo workflow map

**Example:**
```js
import { useState } from './composables/useState.js';

const { nodes, territories, saveSnapshot } = useState();

// Save current state
saveSnapshot('my-checkpoint');
```

## Type Definitions (JSDoc)

The composables include JSDoc type definitions for better IDE support:

```js
/**
 * @typedef {Object} Node
 * @property {string} id - Unique identifier
 * @property {string} label - Display name
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {string|null} territoryId - Parent territory ID
 * @property {string} note - User notes
 * @property {'todo'|'in-progress'|'done'} status - Task status
 * @property {number} timestamp - Creation time
 */
```

## Error Handling

The application includes comprehensive error handling:

1. **Global Error Handler** (src/main.js:10)
   - Catches uncaught component errors
   - Logs to console for debugging
   - Can be extended for error tracking services

2. **Component-Level Error Boundaries** (App.vue:178)
   - `onErrorCaptured` hook prevents error propagation
   - Displays user-friendly error messages
   - Auto-dismisses after 5 seconds

3. **Composable Error Guards**
   - Try-catch blocks in critical operations
   - Graceful fallbacks for missing data
   - Console warnings for debugging

**Example Error Flow:**
```
User Action → Component Error → onErrorCaptured → Error Banner Display
                               ↓
                        Console Error Log
                               ↓
                     (Optional) Sentry/Analytics
```

## Installation & Usage

### Install Dependencies
```bash
cd character-canvas
npm install
```

### Development Server
```bash
npm run dev
```
Opens at `http://localhost:3000` with hot module replacement.

### Production Build
```bash
npm run build
```
Outputs to `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## Features

### Interactive Canvas
- **Pan:** Click and drag on canvas background
- **Zoom:** Scroll wheel (zooms at cursor position)
- **Zoom Controls:** +/- buttons in toolbar
- **Center View:** Reset button returns to initial viewport

### Node Management
- **Quick Add:** Type label + Enter in toolbar
- **Drag Nodes:** Click and drag any node
- **Select Node:** Double-click to open inspector panel
- **Edit Node:** Update label, notes, and status in inspector

### Territories
- Visual grouping areas for nodes
- Defined by {x, y, w, h} rectangles
- Automatic in generated maps

### SWOT Analysis
- Input chat description in sidebar
- Click "Analyze → SWOT" (currently a stub)
- Edit SWOT fields directly
- Integrated with state persistence

### State Persistence
- **Auto-save:** Triggered by "Generate Map"
- **Manual Save:** Click "Save" button
- **Load:** Click "Load" button (loads most recent)
- **Storage:** Browser localStorage (key: 'mvp-history')

## Dependencies

### Runtime
- **vue** (^3.5.13) - Progressive JavaScript framework

### Development
- **@vitejs/plugin-vue** (^5.2.4) - Vue 3 SFC support for Vite
- **vite** (^6.0.7) - Next-generation frontend build tool

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance Considerations

1. **Code Splitting:** Vue vendor chunk separated (see vite.config.js:15)
2. **Reactive Arrays:** Uses Vue 3's reactive() for optimal reactivity
3. **Event Handlers:** Debounced where appropriate
4. **SVG Rendering:** Hardware-accelerated transforms

## Extending the Application

### Adding a New Composable

```js
// src/composables/useMyFeature.js
import { ref, reactive } from 'vue';

export function useMyFeature() {
  const myState = ref(null);

  const myAction = () => {
    // Implementation
  };

  return {
    myState,
    myAction
  };
}
```

### Using in App.vue

```js
import { useMyFeature } from './composables/useMyFeature.js';

export default {
  setup() {
    const { myState, myAction } = useMyFeature();

    return {
      myState,
      myAction
    };
  }
}
```

### Adding New Node Properties

1. Update type definition in `useState.js`
2. Add field to `generateMap()` demo data
3. Add input field in App.vue inspector panel
4. Update `saveSnapshot()` if needed for persistence

## Troubleshooting

### "Application Failed to Load"
- Check browser console for errors
- Ensure `npm install` completed successfully
- Verify Node.js version (14.18+ or 16+ recommended)

### Nodes Not Dragging
- Check that `onNodeDragStart` is properly bound
- Verify `svgToWorld` is imported in `useNodes.js`
- Ensure event handlers are not being prevented

### State Not Persisting
- Check browser localStorage is enabled
- Verify `saveSnapshot` is being called
- Check console for localStorage errors (quota exceeded)

## License

Private project - Not licensed for distribution

## Contributing

This is a prototype project. For questions or contributions, contact the development team.
