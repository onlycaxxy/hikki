/**
 * Example usage of nodePositioning module
 * Demonstrates hierarchical layout with cycle handling
 */

import { placeNodes } from '../src/services/nodePositioning.js';

// Example 1: Simple hierarchy (no cycles)
console.log('=== Example 1: Simple Hierarchy ===\n');

const simpleNodes = [
  { id: 'A', label: 'Root Concept', type: 'concept' },
  { id: 'B', label: 'Sub-concept 1', type: 'concept' },
  { id: 'C', label: 'Sub-concept 2', type: 'concept' },
  { id: 'D', label: 'Detail 1', type: 'entity' },
  { id: 'E', label: 'Detail 2', type: 'entity' }
];

const simpleEdges = [
  { id: 'e1', source: 'A', target: 'B', type: 'hierarchy' },
  { id: 'e2', source: 'A', target: 'C', type: 'hierarchy' },
  { id: 'e3', source: 'B', target: 'D', type: 'dependency' },
  { id: 'e4', source: 'C', target: 'E', type: 'dependency' }
];

const positioned1 = placeNodes(simpleNodes, simpleEdges);
positioned1.forEach(node => {
  console.log(`${node.label}: (${node.x}, ${node.y})`);
});

// Example 2: Graph with cycles
console.log('\n=== Example 2: Graph with Cycles ===\n');

const cyclicNodes = [
  { id: 'A', label: 'Node A', type: 'concept' },
  { id: 'B', label: 'Node B', type: 'concept' },
  { id: 'C', label: 'Node C', type: 'concept' },
  { id: 'D', label: 'Node D', type: 'concept' }
];

const cyclicEdges = [
  // A → B → C → D (linear path)
  { id: 'e1', source: 'A', target: 'B', type: 'dependency' },
  { id: 'e2', source: 'B', target: 'C', type: 'dependency' },
  { id: 'e3', source: 'C', target: 'D', type: 'dependency' },
  // Cycle: D → B (back edge)
  { id: 'e4', source: 'D', target: 'B', type: 'dependency' }
];

const positioned2 = placeNodes(cyclicNodes, cyclicEdges);
positioned2.forEach(node => {
  console.log(`${node.label}: (${node.x}, ${node.y})`);
});

console.log('\nNote: B, C, D should be at the same Y-level due to cycle');

// Example 3: Complex hierarchy with semantic grouping
console.log('\n=== Example 3: Semantic Grouping by Type ===\n');

const complexNodes = [
  // Root concepts
  { id: 'root1', label: 'Learning Path', type: 'concept' },

  // Level 1: Different types
  { id: 'skill1', label: 'Reading', type: 'concept' },
  { id: 'skill2', label: 'Writing', type: 'concept' },
  { id: 'skill3', label: 'Listening', type: 'concept' },

  // Level 2: Specific activities
  { id: 'act1', label: 'Practice Test 1', type: 'event' },
  { id: 'act2', label: 'Practice Test 2', type: 'event' },
  { id: 'act3', label: 'Mock Exam', type: 'event' }
];

const complexEdges = [
  // Root dependencies
  { id: 'e1', source: 'root1', target: 'skill1', type: 'hierarchy' },
  { id: 'e2', source: 'root1', target: 'skill2', type: 'hierarchy' },
  { id: 'e3', source: 'root1', target: 'skill3', type: 'hierarchy' },

  // Skill to activity dependencies
  { id: 'e4', source: 'skill1', target: 'act1', type: 'dependency' },
  { id: 'e5', source: 'skill2', target: 'act2', type: 'dependency' },
  { id: 'e6', source: 'skill3', target: 'act3', type: 'dependency' }
];

const positioned3 = placeNodes(complexNodes, complexEdges);
positioned3.forEach(node => {
  console.log(`${node.label} [${node.type}]: (${node.x}, ${node.y})`);
});

console.log('\nNote: Nodes at same level are grouped by type (concept vs event)');

// Example 4: Custom spacing configuration
console.log('\n=== Example 4: Custom Spacing ===\n');

const positioned4 = placeNodes(simpleNodes, simpleEdges, {
  verticalSpacing: 200,    // More vertical space
  horizontalSpacing: 150,  // Less horizontal space
  groupSpacing: 50,        // Smaller group gaps
  startX: 50,
  startY: 50
});

positioned4.forEach(node => {
  console.log(`${node.label}: (${node.x}, ${node.y})`);
});

// Example 5: Real-world scenario - IELTS study plan
console.log('\n=== Example 5: IELTS Study Plan (Real-world) ===\n');

const ieltsNodes = [
  // Starting point
  { id: 'start', label: 'Begin IELTS Prep', type: 'event' },

  // Core skills (all depend on start)
  { id: 'reading', label: 'Reading Skills', type: 'concept' },
  { id: 'writing', label: 'Writing Skills', type: 'concept' },
  { id: 'listening', label: 'Listening Skills', type: 'concept' },
  { id: 'speaking', label: 'Speaking Skills', type: 'concept' },

  // Practice materials (depend on skills)
  { id: 'read-practice', label: 'Reading Practice', type: 'event' },
  { id: 'write-practice', label: 'Writing Practice', type: 'event' },
  { id: 'listen-practice', label: 'Listening Practice', type: 'event' },
  { id: 'speak-practice', label: 'Speaking Practice', type: 'event' },

  // Final exam (depends on all practices)
  { id: 'exam', label: 'IELTS Exam', type: 'event' }
];

const ieltsEdges = [
  // Start to skills
  { id: 'e1', source: 'start', target: 'reading', type: 'dependency' },
  { id: 'e2', source: 'start', target: 'writing', type: 'dependency' },
  { id: 'e3', source: 'start', target: 'listening', type: 'dependency' },
  { id: 'e4', source: 'start', target: 'speaking', type: 'dependency' },

  // Skills to practice
  { id: 'e5', source: 'reading', target: 'read-practice', type: 'dependency' },
  { id: 'e6', source: 'writing', target: 'write-practice', type: 'dependency' },
  { id: 'e7', source: 'listening', target: 'listen-practice', type: 'dependency' },
  { id: 'e8', source: 'speaking', target: 'speak-practice', type: 'dependency' },

  // Practice to exam
  { id: 'e9', source: 'read-practice', target: 'exam', type: 'dependency' },
  { id: 'e10', source: 'write-practice', target: 'exam', type: 'dependency' },
  { id: 'e11', source: 'listen-practice', target: 'exam', type: 'dependency' },
  { id: 'e12', source: 'speak-practice', target: 'exam', type: 'dependency' }
];

const positioned5 = placeNodes(ieltsNodes, ieltsEdges);

// Group by Y-level for clearer output
const byLevel = {};
positioned5.forEach(node => {
  if (!byLevel[node.y]) byLevel[node.y] = [];
  byLevel[node.y].push(node);
});

Object.keys(byLevel).sort((a, b) => a - b).forEach(y => {
  console.log(`\nLevel ${y}:`);
  byLevel[y].forEach(node => {
    console.log(`  - ${node.label} (x: ${node.x})`);
  });
});

console.log('\n=== All Examples Complete ===');
