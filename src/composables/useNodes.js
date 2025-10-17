// src/composables/useNodes.js
import { reactive, ref } from 'vue';
import { nodes, territories, immediateSave } from './useState.js';
import { svgToWorld, viewBox } from './useCanvas.js';

// Territory boundary constraints
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const TERRITORY_PADDING = 20;

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
  const p = svgToWorld(e);
  const n = nodes.find(x => x.id === dragging.id);
  if (!n) return;

  // Calculate new position
  let newX = p.x - dragging.ox;
  let newY = p.y - dragging.oy;

  // Find which territory this node belongs to
  const territory = territories.find(t =>
    t.nodeIds && t.nodeIds.includes(n.id)
  );

  // Constrain to territory bounds if node is in a territory
  if (territory) {
    // Min bounds (left, top)
    const minX = territory.x + TERRITORY_PADDING;
    const minY = territory.y + 60 + TERRITORY_PADDING; // 60 = header height

    // Max bounds (right, bottom) - account for node size
    const maxX = territory.x + territory.w - NODE_WIDTH / 2 - TERRITORY_PADDING;
    const maxY = territory.y + territory.h - NODE_HEIGHT / 2 - TERRITORY_PADDING;

    // Clamp position
    newX = Math.max(minX + NODE_WIDTH / 2, Math.min(newX, maxX));
    newY = Math.max(minY + NODE_HEIGHT / 2, Math.min(newY, maxY));

    // Visual feedback when hitting boundary
    const isAtBoundary =
      newX !== (p.x - dragging.ox) || newY !== (p.y - dragging.oy);

    if (isAtBoundary && !n._boundaryWarned) {
      console.log(`🚧 Node "${n.label}" constrained to territory "${territory.label}"`);
      n._boundaryWarned = true; // Prevent log spam
    }
  }

  n.x = newX;
  n.y = newY;
};

export const onNodeDragEnd = (e) => {
  // Clear boundary warning flag
  if (dragging.id) {
    const n = nodes.find(x => x.id === dragging.id);
    if (n) delete n._boundaryWarned;
  }

  dragging.active = false;
  dragging.id = null;
  window.removeEventListener('mousemove', onNodeDragMove);
  window.removeEventListener('mouseup', onNodeDragEnd);

  // Immediate save after drag (position change)
  immediateSave();
};

export function useNodes() {
    return {
        selectedNode, quickNodeLabel, editingNode, dragging,
        nodeById, selectNode, deselectNode, quickAddNode,
        onNodeDragStart, onNodeDragMove, onNodeDragEnd,
    }
}

