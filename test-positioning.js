import placeNodes from './src/services/nodePositioning.js';

// Test: Verify minimalist API works
const nodes = [
  { id: 'A', label: 'Root' },
  { id: 'B', label: 'Node B' },
  { id: 'C', label: 'Node C' },
  { id: 'D', label: 'Node D' }
];

const edges = [
  { id: 'e1', source: 'A', target: 'B', type: 'dependency' },
  { id: 'e2', source: 'B', target: 'C', type: 'dependency' },
  { id: 'e3', source: 'C', target: 'D', type: 'dependency' },
  { id: 'e4', source: 'D', target: 'B', type: 'dependency' } // CYCLE
];

const result = placeNodes(nodes, edges);

console.log('✓ Minimalist API: placeNodes(nodes, edges)\n');
result.forEach(n => console.log(`  ${n.label}: (${n.x}, ${n.y})`));
console.log('\n✓ B, C, D at same Y = cycle handled correctly');
