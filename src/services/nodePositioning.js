/**
 * Node Positioning Module
 *
 * Simple two-pass layout algorithm:
 * - Y-position: Hierarchical depth (dependency + hierarchy edges)
 * - X-position: Semantic grouping (by type or territory)
 * - Cycle handling: Visited set, first-path-wins
 */

// Built-in defaults (optimized for typical use)
const VERTICAL_SPACING = 150;
const HORIZONTAL_SPACING = 200;
const GROUP_SPACING = 100;
const START_X = 100;
const START_Y = 100;

/**
 * Position all nodes based on edges
 * @param {Array} nodes - Node objects (must have .id)
 * @param {Array} edges - Edge objects (must have .source, .target, .type)
 * @returns {Array} Nodes with x, y coordinates
 */
export function placeNodes(nodes, edges) {
  // Pass 1: Y-axis (hierarchical depth)
  nodes.forEach(node => {
    node.y = calculateYPosition(node, edges);
  });

  // Pass 2: X-axis (semantic grouping)
  nodes.forEach(node => {
    node.x = calculateXPosition(node, nodes);
  });

  return nodes;
}

/**
 * Calculate Y position based on hierarchical depth
 */
function calculateYPosition(node, edges) {
  const hierarchicalEdges = edges.filter(e =>
    (e.type === 'hierarchy' || e.type === 'dependency') && e.target === node.id
  );

  if (hierarchicalEdges.length === 0) {
    return START_Y; // Root node
  }

  const maxDepth = findLongestPathToNode(node.id, edges, new Set());
  return START_Y + (maxDepth * VERTICAL_SPACING);
}

/**
 * Find longest path using DFS with cycle detection
 */
function findLongestPathToNode(nodeId, edges, visited) {
  if (visited.has(nodeId)) return 0; // Cycle detected

  visited.add(nodeId);

  const incomingEdges = edges.filter(e =>
    (e.type === 'hierarchy' || e.type === 'dependency') && e.target === nodeId
  );

  if (incomingEdges.length === 0) {
    visited.delete(nodeId);
    return 0; // Root node
  }

  let maxDepth = 0;
  for (const edge of incomingEdges) {
    const depth = findLongestPathToNode(edge.source, edges, visited);
    maxDepth = Math.max(maxDepth, depth);
  }

  visited.delete(nodeId);
  return maxDepth + 1;
}

/**
 * Calculate X position based on semantic grouping
 */
function calculateXPosition(node, allNodes) {
  const sameLevelNodes = allNodes.filter(n => n.y === node.y);
  const groups = groupByType(sameLevelNodes);

  // Find node's group and position
  let groupIndex = 0;
  let positionInGroup = 0;

  for (let i = 0; i < groups.length; i++) {
    const index = groups[i].findIndex(n => n.id === node.id);
    if (index !== -1) {
      groupIndex = i;
      positionInGroup = index;
      break;
    }
  }

  // Calculate position
  const groupOffset = groupIndex * GROUP_SPACING;
  let nodesBeforeGroup = 0;
  for (let i = 0; i < groupIndex; i++) {
    nodesBeforeGroup += groups[i].length;
  }

  return START_X + groupOffset + ((nodesBeforeGroup + positionInGroup) * HORIZONTAL_SPACING);
}

/**
 * Group nodes by type
 */
function groupByType(nodes) {
  const groups = new Map();

  nodes.forEach(node => {
    const type = node.type || 'default';
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type).push(node);
  });

  return Array.from(groups.values());
}

export default placeNodes;
