import { placeNodes } from './src/services/nodePositioning.js';

// Minimal test: Verify cycle handling works
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
  { id: 'e4', source: 'D', target: 'B', type: 'dependency' } // CYCLE: D→B
];

const result = placeNodes(nodes, edges);

console.log('Cycle Test Results:');
result.forEach(n => console.log(`  ${n.label}: y=${n.y}`));
console.log('\n✓ If B, C, D have same Y value, cycle handling works correctly');
