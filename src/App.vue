<template>
  <div class="app">
    <!-- Sidebar: chat & analysis -->
    <aside class="sidebar">
      <div>
        <h2>Character Chat ▸ Needs</h2>
        <textarea
          v-model="chatInput"
          :disabled="isGenerating"
          placeholder="e.g. I want to prepare for IELTS in 8 weeks; I struggle with timing and writing Task 1..."
        ></textarea>
        <div class="row">
          <button class="btn" @click="runAnalysis" :disabled="isGenerating">
            Analyze ▸ SWOT
          </button>
          <button class="btn" @click="generateMap" :disabled="isGenerating">
            <span v-if="!isGenerating">Generate Map</span>
            <span v-else class="spinner-row">
              <span class="spinner"></span>
              Generating...
            </span>
          </button>
        </div>
      </div>

      <div>
        <h2>SWOT (editable)</h2>
        <label class="muted">Strengths</label>
        <textarea v-model="swot.strengths"></textarea>
        <label class="muted">Weaknesses</label>
        <textarea v-model="swot.weaknesses"></textarea>
        <label class="muted">Opportunities</label>
        <textarea v-model="swot.opportunities"></textarea>
        <label class="muted">Threats</label>
        <textarea v-model="swot.threats"></textarea>
        <div class="row">
          <button class="btn" @click="handleSave">Save</button>
          <button class="btn" @click="handleLoad">Load</button>
          <button class="btn" @click="handleReset">Reset</button>
        </div>
      </div>
    </aside>

    <!-- Main: toolbar + canvas -->
    <main class="main">
      <div class="toolbar">
        <span class="badge">Zoom: {{ zoomPercentage }}%</span>
        <button class="btn" @click="() => zoomAtCenter(1.2)">+</button>
        <button class="btn" @click="() => zoomAtCenter(1 / 1.2)">−</button>
        <button class="btn" @click="centerView">Center</button>
        <input
          type="text"
          placeholder="Quick add node (Label)"
          v-model="quickNodeLabel"
          @keydown.enter="quickAddNode"
        />
        <button class="btn" @click="quickAddNode">Add Node</button>
        <span class="muted">Click+Drag to pan · Scroll to zoom · Drag nodes</span>
      </div>

      <section class="canvas-wrap">
        <svg
          :class="{ dragging: isPanning }"
          :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`"
          @mousedown="onPanStart"
          @mousemove="onPanMove"
          @mouseup="onPanEnd"
          @mouseleave="onPanEnd"
          @wheel.prevent="onWheel"
        >
          <!-- defs -->
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#b9bfd2"></path>
            </marker>
          </defs>

          <!-- territories -->
          <g v-for="t in territories" :key="t.id">
            <rect
              class="territory"
              :x="t.x"
              :y="t.y"
              :rx="12"
              :ry="12"
              :width="t.w"
              :height="t.h"
            ></rect>
            <text class="territory-title" :x="t.x + 10" :y="t.y + 18">
              {{ t.label }}
            </text>
          </g>

          <!-- edges -->
          <g>
            <line
              v-for="e in edges"
              :key="e.id"
              class="edge"
              :x1="nodeById(e.source)?.x || 0"
              :y1="nodeById(e.source)?.y || 0"
              :x2="nodeById(e.target)?.x || 0"
              :y2="nodeById(e.target)?.y || 0"
            />
          </g>

          <!-- nodes -->
          <g
            v-for="n in nodes"
            :key="n.id"
            @mousedown.stop="(e) => onNodeDragStart(e, n)"
            @dblclick.stop="() => selectNode(n)"
          >
            <rect
              :class="['node', selectedNode && selectedNode.id === n.id ? 'selected' : '']"
              :x="n.x - 60"
              :y="n.y - 22"
              rx="10"
              ry="10"
              width="120"
              height="44"
            />
            <text
              class="node-label"
              :x="n.x"
              :y="n.y + 4"
              text-anchor="middle"
            >
              {{ n.label }}
            </text>
          </g>
        </svg>

        <!-- Inspector Panel (when node selected) -->
        <div v-if="selectedNode" class="inspector">
          <h3>{{ selectedNode.label }}</h3>
          <input
            v-model="selectedNode.label"
            placeholder="Node Label"
            @input="handleNodeUpdate"
          />
          <textarea
            v-model="selectedNode.note"
            placeholder="Notes..."
            @input="handleNodeUpdate"
          ></textarea>
          <select v-model="selectedNode.status" @change="handleNodeUpdate">
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <button class="btn" @click="deselectNode">Close</button>
        </div>
      </section>
    </main>

    <!-- Error Display -->
    <div v-if="error" class="error-banner" @click="clearError">
      {{ error }} (click to dismiss)
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onErrorCaptured } from 'vue';
import { useState } from './composables/useState.js';
import { useCanvas } from './composables/useCanvas.js';
import { useNodes } from './composables/useNodes.js';

export default {
  name: 'App',
  setup() {
    // Error handling
    const error = ref(null);

    const handleError = (err, context = '') => {
      console.error(`[App Error] ${context}:`, err);
      error.value = `${context}: ${err.message || err}`;
      setTimeout(() => { error.value = null; }, 5000);
    };

    const clearError = () => { error.value = null; };

    // Capture component errors
    onErrorCaptured((err, instance, info) => {
      handleError(err, `Component error (${info})`);
      return false; // Prevent error propagation
    });

    // Execute composables with error handling
    let stateComposable, canvasComposable, nodesComposable;

    try {
      stateComposable = useState();
      canvasComposable = useCanvas();
      nodesComposable = useNodes();
    } catch (err) {
      handleError(err, 'Composable initialization failed');
      // Provide fallbacks
      stateComposable = { territories: ref([]), nodes: ref([]), edges: ref([]), chatInput: ref(''), swot: ref({}) };
      canvasComposable = { viewBox: ref({ x: 0, y: 0, w: 1600, h: 900 }), isPanning: ref(false) };
      nodesComposable = { selectedNode: ref(null), quickNodeLabel: ref('') };
    }

    // Destructure composables
    const {
      territories, nodes, edges, chatInput, swot, isGenerating,
      runAnalysis, generateMap, saveSnapshot, loadSnapshot, autoLoad
    } = stateComposable;

    const {
      viewBox, isPanning,
      onPanStart, onPanMove, onPanEnd, onWheel,
      svgToWorld, worldToScreen, zoomToNode
    } = canvasComposable;

    const {
      selectedNode, quickNodeLabel, editingNode, dragging,
      nodeById, selectNode, deselectNode, quickAddNode,
      onNodeDragStart, onNodeDragMove, onNodeDragEnd
    } = nodesComposable;

    // Computed zoom percentage
    const zoomPercentage = computed(() => {
      const initW = 1600; // Default initial width
      return (100 * (initW / viewBox.w)).toFixed(0);
    });

    // Enhanced action handlers with error handling
    const handleSave = () => {
      try {
        saveSnapshot(`manual-${Date.now()}`);
        console.log('✓ State saved successfully');
      } catch (err) {
        handleError(err, 'Save failed');
      }
    };

    const handleLoad = () => {
      try {
        const index = 0; // Load latest snapshot
        loadSnapshot(index);
        console.log('✓ State loaded successfully');
      } catch (err) {
        handleError(err, 'Load failed');
      }
    };

    const handleReset = () => {
      try {
        if (confirm('Reset all data? This cannot be undone.')) {
          territories.splice(0);
          nodes.splice(0);
          edges.splice(0);
          chatInput.value = '';
          swot.strengths = '';
          swot.weaknesses = '';
          swot.opportunities = '';
          swot.threats = '';
          console.log('✓ Reset complete');
        }
      } catch (err) {
        handleError(err, 'Reset failed');
      }
    };

    const handleNodeUpdate = () => {
      // Trigger reactivity and optionally auto-save
      console.log('Node updated:', selectedNode.value);
    };

    // Zoom controls
    const zoomAtCenter = (factor) => {
      try {
        const cx = viewBox.x + viewBox.w / 2;
        const cy = viewBox.y + viewBox.h / 2;
        const newW = viewBox.w / factor;
        const newH = viewBox.h / factor;
        viewBox.x = cx - newW / 2;
        viewBox.y = cy - newH / 2;
        viewBox.w = newW;
        viewBox.h = newH;
      } catch (err) {
        handleError(err, 'Zoom failed');
      }
    };

    const centerView = () => {
      try {
        viewBox.x = 0;
        viewBox.y = 0;
        viewBox.w = 1600;
        viewBox.h = 900;
      } catch (err) {
        handleError(err, 'Center view failed');
      }
    };

    // Mount lifecycle
    onMounted(() => {
      try {
        // Try to load saved state first
        const loaded = autoLoad && typeof autoLoad === 'function' && autoLoad();

        // If no saved state, generate initial demo map
        if (!loaded && generateMap && typeof generateMap === 'function') {
          console.log('No saved state, generating initial map...');
          generateMap();
        }
      } catch (err) {
        handleError(err, 'Initialization failed');
      }
    });

    // Return everything to template
    return {
      // State
      chatInput,
      swot,
      isGenerating,
      territories,
      nodes,
      edges,
      selectedNode,
      quickNodeLabel,
      editingNode,

      // View
      viewBox,
      isPanning,
      zoomPercentage,

      // Actions
      runAnalysis,
      generateMap,
      handleSave,
      handleLoad,
      handleReset,
      handleNodeUpdate,
      onWheel,
      onPanStart,
      onPanMove,
      onPanEnd,
      onNodeDragStart,
      onNodeDragMove,
      onNodeDragEnd,
      nodeById,
      selectNode,
      deselectNode,
      quickAddNode,
      zoomToNode,
      zoomAtCenter,
      centerView,

      // Error handling
      error,
      clearError
    };
  }
};
</script>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: 100vh;
}

.sidebar {
  border-right: 1px solid #eee;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.sidebar h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.sidebar textarea {
  width: 100%;
  min-height: 120px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
}

.sidebar .btn {
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: #111;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.sidebar .btn:hover:not(:disabled) {
  background: #333;
}

.sidebar .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sidebar .row {
  display: flex;
  gap: 8px;
}

.main {
  display: grid;
  grid-template-rows: 48px 1fr;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}

.toolbar .btn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: #fafafa;
  cursor: pointer;
  transition: background 0.2s;
}

.toolbar .btn:hover {
  background: #f0f0f0;
}

.toolbar input[type="text"] {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  min-width: 200px;
  font-family: inherit;
}

.canvas-wrap {
  position: relative;
  background: #fbfbfd;
}

svg {
  width: 100%;
  height: calc(100vh - 48px);
  display: block;
  cursor: grab;
}

svg.dragging {
  cursor: grabbing;
}

.territory {
  fill: #f6f7fb;
  stroke: #e5e7f0;
  stroke-width: 1.5;
}

.territory-title {
  font-size: 13px;
  fill: #556;
}

.node {
  fill: #fff;
  stroke: #c8cdda;
  stroke-width: 1.5;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08));
  cursor: move;
  transition: stroke 0.2s;
}

.node:hover {
  stroke: #8b90a8;
}

.node.selected {
  stroke: #4f46e5;
  stroke-width: 2;
}

.node-label {
  font-size: 12px;
  fill: #334;
  pointer-events: none;
}

.edge {
  stroke: #b9bfd2;
  stroke-width: 1.25;
  marker-end: url(#arrow);
}

.inspector {
  position: absolute;
  right: 18px;
  top: 18px;
  width: 300px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  padding: 12px;
  display: grid;
  gap: 10px;
}

.inspector h3 {
  margin: 0;
  font-size: 16px;
}

.inspector input,
.inspector textarea,
.inspector select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: inherit;
}

.inspector .btn {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: #111;
  color: #fff;
  cursor: pointer;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 999px;
  font-size: 12px;
  background: #fff;
}

.muted {
  color: #667085;
  font-size: 12px;
}

.error-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #fee;
  color: #c33;
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid #fcc;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
