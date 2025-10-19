<template>
  <div class="app">
    <!-- Sidebar: chat & analysis -->
    <aside class="sidebar">
      <!-- Chat Section (Always visible) -->
      <section class="sidebar-section chat-section">
        <h2 class="section-title">Character Chat ▸ Needs</h2>
        <textarea
          v-model="chatInput"
          :disabled="isGenerating"
          placeholder="e.g. I want to prepare for IELTS in 8 weeks; I struggle with timing and writing Task 1..."
          class="chat-textarea"
        ></textarea>
        <div class="button-row">
          <button class="btn btn-action" @click="runAnalysis" :disabled="isGenerating">
            Analyze SWOT
          </button>
          <button class="btn btn-action" @click="generateMap" :disabled="isGenerating">
            <span v-if="!isGenerating">Generate Map</span>
            <span v-else class="spinner-row">
              <span class="spinner"></span>
              Generating...
            </span>
          </button>
        </div>
      </section>

      <!-- SWOT Section (Collapsible) -->
      <section class="sidebar-section swot-section">
        <button class="section-toggle" @click="swotExpanded = !swotExpanded">
          <span class="toggle-icon">{{ swotExpanded ? '▼' : '▶' }}</span>
          <h2 class="section-title-inline">SWOT Analysis</h2>
        </button>

        <div v-if="swotExpanded" class="swot-grid">
          <div class="swot-quadrant">
            <label class="swot-label">Strengths</label>
            <textarea v-model="swot.strengths" rows="3"></textarea>
          </div>
          <div class="swot-quadrant">
            <label class="swot-label">Weaknesses</label>
            <textarea v-model="swot.weaknesses" rows="3"></textarea>
          </div>
          <div class="swot-quadrant">
            <label class="swot-label">Opportunities</label>
            <textarea v-model="swot.opportunities" rows="3"></textarea>
          </div>
          <div class="swot-quadrant">
            <label class="swot-label">Threats</label>
            <textarea v-model="swot.threats" rows="3"></textarea>
          </div>
        </div>
      </section>

      <!-- File Management (Compact icon bar) -->
      <section class="sidebar-section file-section">
        <div class="file-actions">
          <button class="icon-btn" @click="handleSave" title="Save current state">
            💾
          </button>
          <button class="icon-btn" @click="handleLoad" title="Load saved state">
            📂
          </button>
          <button class="icon-btn" @click="handleExport" title="Export as JSON">
            📥
          </button>
          <button class="icon-btn" @click="handleImport" title="Import from JSON">
            📤
          </button>
          <button class="icon-btn icon-btn-danger" @click="handleReset" title="Reset all data">
            🗑️
          </button>
        </div>
      </section>
    </aside>

    <!-- Main: toolbar + canvas -->
    <main class="main">
      <div class="toolbar">
        <!-- Group 1: View Controls -->
        <div class="toolbar-group">
          <span class="badge" title="Current zoom level">Zoom: {{ zoomPercentage }}%</span>
          <button class="btn toolbar-btn" @click="() => zoomAtCenter(1.2)" title="Zoom in">+</button>
          <button class="btn toolbar-btn" @click="() => zoomAtCenter(1 / 1.2)" title="Zoom out">−</button>
          <button class="btn toolbar-btn" @click="centerView" title="Reset view to center">Center</button>
        </div>

        <!-- Divider -->
        <div class="toolbar-divider"></div>

        <!-- Group 2: Quick Add (CTA Style) -->
        <div class="toolbar-group toolbar-group-cta">
          <input
            type="text"
            placeholder="Quick add node..."
            v-model="quickNodeLabel"
            @keydown.enter="quickAddNode"
            class="quick-add-input"
            title="Type a label and press Enter or click Add Node"
          />
          <button class="btn btn-primary" @click="quickAddNode" title="Add new node to canvas">
            + Add Node
          </button>
        </div>
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
            @contextmenu.prevent="(e) => onNodeRightClick(e, n)"
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
          <!-- Header -->
          <div class="inspector-header">
            <h3>{{ selectedNode.label }}</h3>
            <button class="btn-icon" @click="deselectNode">✕</button>
          </div>

          <!-- Node Label -->
          <div class="field-group">
            <label class="field-label">Label</label>
            <input
              v-model="selectedNode.label"
              placeholder="Node name..."
              @input="handleNodeUpdate"
            />
          </div>

          <!-- Status -->
          <div class="field-group">
            <label class="field-label">Status</label>
            <select v-model="selectedNode.status" @change="handleNodeUpdate">
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <!-- Field Notes (Optional) -->
          <div class="field-group field-notes">
            <label class="field-label">Notes</label>
            <textarea
              v-model="selectedNode.note"
              placeholder="Add observations, insights, or leave empty..."
              @input="handleNodeUpdate"
            ></textarea>
          </div>

          <!-- Footer -->
          <div class="inspector-footer">
            <span class="timestamp">{{ formatTimestamp(selectedNode.timestamp) }}</span>
          </div>
        </div>
      </section>
    </main>

    <!-- Custom Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{
        left: contextMenu.x + 'px',
        top: contextMenu.y + 'px'
      }"
    >
      <button class="context-menu-item danger" @click="handleDeleteNode">
        <span class="icon">🗑️</span>
        Delete "{{ contextMenu.node?.label }}"
      </button>
      <button class="context-menu-item" @click="closeContextMenu">
        Cancel
      </button>
    </div>

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
    // UI state
    const swotExpanded = ref(false);

    // Error handling
    const error = ref(null);

    const handleError = (err, context = '') => {
      console.error(`[App Error] ${context}:`, err);
      error.value = `${context}: ${err.message || err}`;
      setTimeout(() => { error.value = null; }, 5000);
    };

    const clearError = () => { error.value = null; };

    // Context menu state
    const contextMenu = ref({
      visible: false,
      x: 0,
      y: 0,
      node: null
    });

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
      runAnalysis, generateMap, saveSnapshot, loadSnapshot, autoLoad, deleteNode,
      autoSave, exportState, importState
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

    const handleExport = () => {
      try {
        exportState();
        console.log('✓ Export successful');
      } catch (err) {
        handleError(err, 'Export failed');
      }
    };

    const handleImport = () => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          try {
            await importState(file);
            console.log('✓ Import successful');
          } catch (err) {
            handleError(err, 'Import failed');
          }
        };
        input.click();
      } catch (err) {
        handleError(err, 'Import failed');
      }
    };

    const handleNodeUpdate = () => {
      // Debounced auto-save (waits 500ms after last edit)
      if (selectedNode.value) {
        console.log('📝 Node edit detected:', selectedNode.value.label);
        autoSave();
      }
    };

    // Handle right-click on node - show context menu
    const onNodeRightClick = (event, node) => {
      try {
        event.preventDefault();
        event.stopPropagation();

        // Position context menu at cursor
        contextMenu.value = {
          visible: true,
          x: event.clientX,
          y: event.clientY,
          node: node
        };
      } catch (err) {
        handleError(err, 'Context menu failed');
      }
    };

    // Close context menu
    const closeContextMenu = () => {
      contextMenu.value.visible = false;
      contextMenu.value.node = null;
    };

    // Handle delete from context menu
    const handleDeleteNode = () => {
      try {
        const node = contextMenu.value.node;
        if (!node) return;

        // Close inspector if this node is selected
        if (selectedNode.value && selectedNode.value.id === node.id) {
          deselectNode();
        }

        // Delete the node
        const success = deleteNode(node.id);

        if (!success) {
          handleError(new Error('Failed to delete node'), 'Delete failed');
        }

        // Close context menu
        closeContextMenu();
      } catch (err) {
        handleError(err, 'Delete node failed');
      }
    };

    // Format timestamp for display
    const formatTimestamp = (ts) => {
      if (!ts) return '';
      const date = new Date(ts);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
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

        // Global click handler to close context menu
        const handleGlobalClick = (e) => {
          // Check if click is outside context menu
          if (contextMenu.value.visible && !e.target.closest('.context-menu')) {
            closeContextMenu();
          }
        };

        document.addEventListener('click', handleGlobalClick);

        // Cleanup on unmount
        return () => {
          document.removeEventListener('click', handleGlobalClick);
        };
      } catch (err) {
        handleError(err, 'Initialization failed');
      }
    });

    // Return everything to template
    return {
      // UI state
      swotExpanded,

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
      contextMenu,

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
      handleExport,
      handleImport,
      handleNodeUpdate,
      onNodeRightClick,
      closeContextMenu,
      handleDeleteNode,
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
      formatTimestamp,

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
  grid-template-columns: 280px 1fr;
  height: 100vh;
}

/* ===== SIDEBAR ===== */
.sidebar {
  border-right: 1px solid #e5e7eb;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-section {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

/* Chat Section */
.chat-section {
  padding: 18px;
  background: #fff;
}

.section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.chat-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.button-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-action {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.btn-action:hover:not(:disabled) {
  background: #1f2937;
  transform: translateY(-1px);
}

.btn-action:active:not(:disabled) {
  transform: translateY(0);
}

.btn-action:disabled {
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

/* SWOT Section */
.swot-section {
  background: #fff;
}

.section-toggle {
  width: 100%;
  padding: 12px 0;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.section-toggle:hover {
  opacity: 0.7;
}

.toggle-icon {
  font-size: 12px;
  color: #6b7280;
  transition: transform 0.2s;
}

.section-title-inline {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.swot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.swot-quadrant {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.swot-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.swot-quadrant textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  transition: border-color 0.2s;
}

.swot-quadrant textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

/* File Section */
.file-section {
  background: #f9fafb;
  padding: 12px 16px;
}

.file-actions {
  display: flex;
  gap: 6px;
  justify-content: space-between;
}

.icon-btn {
  flex: 1;
  padding: 10px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.icon-btn-danger:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

/* ===== MAIN & TOOLBAR ===== */
.main {
  display: grid;
  grid-template-rows: 52px 1fr;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-group-cta {
  flex: 1;
  max-width: 500px;
}

.toolbar-divider {
  width: 1px;
  height: 28px;
  background: #d1d5db;
}

.toolbar-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.quick-add-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-family: inherit;
  font-size: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.quick-add-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.canvas-wrap {
  position: relative;
  background: #fbfbfd;
}

svg {
  width: 100%;
  height: calc(100vh - 52px);
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
  right: 20px;
  top: 20px;
  width: 380px;
  max-height: calc(100vh - 80px);
  background: #fdfcfb;
  border: 1px solid #e7e5e1;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: inspectorFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes inspectorFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #ede9e3;
  background: #fdfcfb;
}

.inspector-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: #2d2a26;
  letter-spacing: -0.01em;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #847e75;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-icon:hover {
  background: #f4f1ed;
  color: #2d2a26;
  transform: scale(1.05);
}

.field-group {
  padding: 16px 20px;
  border-bottom: 1px solid #f4f1ed;
}

.field-group:last-of-type {
  border-bottom: none;
}

.field-group.field-notes {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6b6560;
  margin-bottom: 8px;
  letter-spacing: -0.005em;
}

.field-group input[type="text"],
.field-group textarea,
.field-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e7e5e1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  color: #2d2a26;
  background: #ffffff;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.field-group input:focus,
.field-group textarea:focus,
.field-group select:focus {
  outline: none;
  border-color: #c49a6c;
  box-shadow: 0 0 0 3px rgba(196, 154, 108, 0.12);
  background: #ffffff;
}

.field-group textarea {
  resize: vertical;
  min-height: 180px;
  line-height: 1.6;
  flex: 1;
}

.field-group textarea::placeholder {
  color: #b5aca3;
}

.inspector-footer {
  padding: 14px 20px;
  background: #faf9f7;
  border-top: 1px solid #ede9e3;
}

.timestamp {
  font-size: 12px;
  color: #9a8f85;
  letter-spacing: -0.005em;
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

/* Context Menu */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08);
  padding: 4px;
  min-width: 200px;
  z-index: 9999;
  animation: contextMenuSlide 0.15s ease-out;
}

@keyframes contextMenuSlide {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.context-menu-item {
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.15s ease;
  color: #1f2937;
}

.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-item.danger {
  color: #dc2626;
}

.context-menu-item.danger:hover {
  background: #fef2f2;
}

.context-menu-item .icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}
</style>
