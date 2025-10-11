// src/composables/useNodes.js
import { reactive, ref } from 'vue';
import { nodes } from './useState.js';
import { svgToWorld, viewBox } from './useCanvas.js';

/**
 * @typedef {Object} DragState
 * @property {boolean} active - Is dragging active
 * @property {string|null} id - Node being dragged
 * @property {number} ox - Offset X
 * @property {number} oy - Offset Y
 */

// --- NODE/SELECTION STATE ---
const selectedNode = ref(null);
const quickNodeLabel = ref('');
const editingNode = ref(null);

/** @type {import('vue').UnwrapRef<DragState>} */
const dragging = reactive({ active: false, id: null, ox: 0, oy: 0 });

// ---------- NODE / EDGE CRUD helpers ----------
/**
 * Find node by ID
 * @param {string} id - Node ID
 * @returns {import('./useState').Node|undefined}
 */
export function nodeById(id) {
  return nodes.find(n => n.id === id);
}

/**
 * Select a node for editing
 * @param {import('./useState').Node} n - Node to select
 */
export function selectNode(n) {
  selectedNode.value = n;
  editingNode.value = n;
}

/**
 * Deselect current node
 */
export function deselectNode() {
  selectedNode.value = null;
  editingNode.value = null;
}

/**
 * Quick add a new node at viewport center
 */
export function quickAddNode() {
  const label = quickNodeLabel.value.trim();
  if (!label) {
    console.warn('Cannot add node with empty label');
    return;
  }

  const id = crypto.randomUUID();
  const newNode = {
    id,
    label,
    x: viewBox.x + viewBox.w / 2,
    y: viewBox.y + viewBox.h / 2,
    territoryId: null,
    note: '',
    status: 'todo',
    timestamp: Date.now()
  };

  nodes.push(newNode);
  quickNodeLabel.value = '';
}

// ---------- NODE DRAGGING (Uses svgToWorld from useCanvas) ----------
export const onNodeDragStart = (e, node) => {
  e.stopPropagation(); 
  const p = svgToWorld(e); // <-- CRITICAL: Uses imported helper
  dragging.active = true;
  dragging.id = node.id;
  dragging.ox = p.x - node.x;
  dragging.oy = p.y - node.y;
  window.addEventListener('mousemove', onNodeDragMove);
  window.addEventListener('mouseup', onNodeDragEnd);
};

export const onNodeDragMove = (e) => {
  if (!dragging.active || !dragging.id) return;
  const p = svgToWorld(e); // <-- CRITICAL: Uses imported helper
  const n = nodes.find(x => x.id === dragging.id); // <-- CRITICAL: Uses imported 'nodes'
  if (!n) return;
  n.x = p.x - dragging.ox;
  n.y = p.y - dragging.oy;
};

export const onNodeDragEnd = (e) => {
  dragging.active = false;
  dragging.id = null;
  window.removeEventListener('mousemove', onNodeDragMove);
  window.removeEventListener('mouseup', onNodeDragEnd);
};

export function useNodes() {
    return {
        selectedNode, quickNodeLabel, editingNode, dragging,
        nodeById, selectNode, deselectNode, quickAddNode,
        onNodeDragStart, onNodeDragMove, onNodeDragEnd,
    }
}

