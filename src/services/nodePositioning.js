/**
 * Node Positioning Module
 *
 * Calculates positions for nodes based on hierarchical depth (Y-axis)
 * and temporal/semantic grouping (X-axis).
 *
 * Strategy:
 * - Y-position: Based on longest path through dependency + hierarchy edges
 * - X-position: Based on temporal ordering and semantic grouping (territories)
 * - Cycle handling: Visited set, first path wins, same depth for cycle nodes
 */

// Default configuration
const DEFAULT_OPTIONS = {
  verticalSpacing: 150,      // Pixels between hierarchy levels
  horizontalSpacing: 200,    // Pixels between nodes in same level
  groupSpacing: 100,         // Extra spacing between semantic groups
  startX: 100,               // Left margin
  startY: 100                // Top margin
};

/**
 * Main entry point: Position all nodes based on edges
 *
 * @param {Array} nodes - Array of node objects (must have .id)
 * @param {Array} edges - Array of edge objects (must have .source, .target, .type)
 * @param {Object} options - Optional configuration overrides
 * @returns {Array} Nodes with updated x, y coordinates
 */
export function placeNodes(nodes, edges, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // First pass: Calculate Y (Hierarchical depth)
  nodes.forEach(node => {
    node.y = calculateYPosition(node, nodes, edges, config);
  });

  // Second pass: Calculate X (Temporal + Semantic grouping)
  nodes.forEach(node => {
    node.x = calculateXPosition(node, nodes, edges, config);
  });

  return nodes;
}

/**
 * Calculate Y position based on hierarchical depth
 * Uses dependency and hierarchy edges to find longest path to node
 *
 * @param {Object} node - The node to position
 * @param {Array} allNodes - All nodes in the graph
 * @param {Array} edges - All edges in the graph
 * @param {Object} config - Configuration options
 * @returns {number} Y coordinate
 */
export function calculateYPosition(node, allNodes, edges, config) {
  // Find hierarchical and dependency edges that point TO this node
  const hierarchicalEdges = edges.filter(e =>
    (e.type === 'hierarchy' || e.type === 'dependency') && e.target === node.id
  );

  // If no incoming hierarchical edges, this is a root node (depth 0)
  if (hierarchicalEdges.length === 0) {
    return config.startY;
  }

  // Find the longest path to this node
  const maxDepth = findLongestPathToNode(node.id, edges, new Set());

  return config.startY + (maxDepth * config.verticalSpacing);
}

/**
 * Find longest path to a node using DFS with cycle detection
 * Uses visited set - when cycle detected, stop traversal (first path wins)
 *
 * @param {string} nodeId - Target node ID
 * @param {Array} edges - All edges in the graph
 * @param {Set} visited - Set of visited node IDs (for cycle detection)
 * @returns {number} Maximum depth (number of edges in longest path)
 */
export function findLongestPathToNode(nodeId, edges, visited = new Set()) {
  // Cycle detected: stop traversal
  if (visited.has(nodeId)) {
    return 0;
  }

  // Mark as visited
  visited.add(nodeId);

  // Find all edges that point TO this node (incoming edges)
  const incomingEdges = edges.filter(e =>
    (e.type === 'hierarchy' || e.type === 'dependency') && e.target === nodeId
  );

  // Base case: no incoming edges = root node (depth 0)
  if (incomingEdges.length === 0) {
    visited.delete(nodeId); // Clean up for other paths
    return 0;
  }

  // Recursive case: find max depth from all parent nodes
  let maxParentDepth = 0;
  for (const edge of incomingEdges) {
    const parentDepth = findLongestPathToNode(edge.source, edges, visited);
    maxParentDepth = Math.max(maxParentDepth, parentDepth);
  }

  // Clean up visited for other paths
  visited.delete(nodeId);

  // This node's depth = max parent depth + 1
  return maxParentDepth + 1;
}

/**
 * Calculate X position based on temporal ordering and semantic grouping
 *
 * Strategy:
 * 1. Get all nodes at the same Y-level
 * 2. Group by territory (semantic clustering)
 * 3. Within each group, order by temporal/dependency edges
 * 4. Assign X position based on group + position within group
 *
 * @param {Object} node - The node to position
 * @param {Array} allNodes - All nodes in the graph
 * @param {Array} edges - All edges in the graph
 * @param {Object} config - Configuration options
 * @returns {number} X coordinate
 */
export function calculateXPosition(node, allNodes, edges, config) {
  // Get all nodes at the same Y-level
  const sameLevelNodes = allNodes.filter(n => n.y === node.y);

  // Group nodes by territory membership
  const groups = groupNodesByTerritory(sameLevelNodes, allNodes);

  // Find which group this node belongs to
  let groupIndex = 0;
  let positionInGroup = 0;
  let found = false;

  for (let i = 0; i < groups.length && !found; i++) {
    const group = groups[i];
    const index = group.findIndex(n => n.id === node.id);

    if (index !== -1) {
      groupIndex = i;
      positionInGroup = index;
      found = true;
    }
  }

  // Calculate X position:
  // Base X + (group offset) + (position within group)
  const groupOffset = groupIndex * config.groupSpacing;

  // Count total nodes in previous groups for cumulative spacing
  let nodesBeforeThisGroup = 0;
  for (let i = 0; i < groupIndex; i++) {
    nodesBeforeThisGroup += groups[i].length;
  }

  const x = config.startX
    + groupOffset
    + ((nodesBeforeThisGroup + positionInGroup) * config.horizontalSpacing);

  return x;
}

/**
 * Group nodes by territory membership
 * Falls back to node.type if no territories exist
 *
 * @param {Array} nodes - Nodes to group
 * @param {Array} allNodes - All nodes (may have territory info in metadata)
 * @returns {Array<Array>} Array of node groups
 */
function groupNodesByTerritory(nodes, allNodes) {
  // Check if any node has territory information
  const territoriesExist = allNodes.some(n =>
    n.metadata && n.metadata.territories && n.metadata.territories.length > 0
  );

  if (territoriesExist) {
    return groupByTerritoryMembership(nodes);
  }

  // Fallback: group by node.type
  return groupByNodeType(nodes);
}

/**
 * Group nodes by their territory membership
 * Nodes can belong to multiple territories - uses first territory as primary
 *
 * @param {Array} nodes - Nodes to group
 * @returns {Array<Array>} Array of node groups
 */
function groupByTerritoryMembership(nodes) {
  const territoryGroups = new Map();

  nodes.forEach(node => {
    const territories = node.metadata?.territories || [];
    const primaryTerritory = territories[0] || 'no-territory';

    if (!territoryGroups.has(primaryTerritory)) {
      territoryGroups.set(primaryTerritory, []);
    }
    territoryGroups.get(primaryTerritory).push(node);
  });

  return Array.from(territoryGroups.values());
}

/**
 * Group nodes by their type field
 * Fallback when no territory information exists
 *
 * @param {Array} nodes - Nodes to group
 * @returns {Array<Array>} Array of node groups
 */
function groupByNodeType(nodes) {
  const typeGroups = new Map();

  nodes.forEach(node => {
    const nodeType = node.type || 'default';

    if (!typeGroups.has(nodeType)) {
      typeGroups.set(nodeType, []);
    }
    typeGroups.get(nodeType).push(node);
  });

  return Array.from(typeGroups.values());
}

/**
 * Sort nodes within a group by temporal/dependency relationships
 * Uses topological ordering based on dependency edges
 *
 * @param {Array} nodes - Nodes in the same group/level
 * @param {Array} edges - All edges in the graph
 * @returns {Array} Sorted nodes (left to right = temporal order)
 */
export function sortNodesByTemporalOrder(nodes, edges) {
  // Get dependency edges between nodes in this group
  const nodeIds = new Set(nodes.map(n => n.id));
  const internalEdges = edges.filter(e =>
    e.type === 'dependency' &&
    nodeIds.has(e.source) &&
    nodeIds.has(e.target)
  );

  // If no internal dependencies, return original order
  if (internalEdges.length === 0) {
    return nodes;
  }

  // Build adjacency list for topological sort
  const adjList = new Map();
  const inDegree = new Map();

  nodes.forEach(node => {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  internalEdges.forEach(edge => {
    adjList.get(edge.source).push(edge.target);
    inDegree.set(edge.target, inDegree.get(edge.target) + 1);
  });

  // Kahn's algorithm for topological sort
  const sorted = [];
  const queue = [];

  // Start with nodes that have no dependencies
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const nodeId = queue.shift();
    sorted.push(nodeId);

    // Reduce in-degree for neighbors
    adjList.get(nodeId).forEach(neighborId => {
      inDegree.set(neighborId, inDegree.get(neighborId) - 1);
      if (inDegree.get(neighborId) === 0) {
        queue.push(neighborId);
      }
    });
  }

  // If sorted doesn't include all nodes, there's a cycle - use original order for remaining
  if (sorted.length < nodes.length) {
    const sortedSet = new Set(sorted);
    nodes.forEach(node => {
      if (!sortedSet.has(node.id)) {
        sorted.push(node.id);
      }
    });
  }

  // Map back to node objects
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return sorted.map(id => nodeMap.get(id));
}

export default {
  placeNodes,
  calculateYPosition,
  calculateXPosition,
  findLongestPathToNode,
  sortNodesByTemporalOrder
};
