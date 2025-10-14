
import { reactive, ref } from 'vue';
import placeNodes from '../services/nodePositioning.js';

/**
 * @typedef {Object} Territory
 * @property {string} id - Unique identifier
 * @property {string} label - Display name
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} w - Width
 * @property {number} h - Height
 */

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

/**
 * @typedef {Object} Edge
 * @property {string} id - Unique identifier
 * @property {string} source - Source node ID
 * @property {string} target - Target node ID
 */

/**
 * @typedef {Object} SWOT
 * @property {string} strengths
 * @property {string} weaknesses
 * @property {string} opportunities
 * @property {string} threats
 */

// --- CORE DATA STATE (EXPORTED FOR GLOBAL ACCESS) ---
/** @type {import('vue').UnwrapRef<Territory[]>} */
export const territories = reactive([]);

/** @type {import('vue').UnwrapRef<Node[]>} */
export const nodes = reactive([]);

/** @type {import('vue').UnwrapRef<Edge[]>} */
export const edges = reactive([]);

// --- FEATURE/UI STATE ---
export const chatInput = ref('');
export const isGenerating = ref(false); // Loading state for LLM calls

/** @type {import('vue').UnwrapRef<SWOT>} */
export const swot = reactive({ strengths:'', weaknesses:'', opportunities:'', threats:'' });

// ---------- AUTO-SAVE / AUTO-LOAD (Basic Persistence) ----------
const AUTO_SAVE_KEY = 'hikki-canvas-state';

/**
 * Auto-save current canvas state to localStorage
 * Called automatically after map generation and on changes
 */
export function autoSave() {
    try {
        const state = {
            territories: JSON.parse(JSON.stringify(territories)),
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
            timestamp: Date.now()
        };
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(state));
        console.log('💾 Auto-saved canvas state');
    } catch (error) {
        console.error('Auto-save failed:', error);
    }
}

/**
 * Auto-load canvas state from localStorage
 * Called on page load
 * @returns {boolean} True if state was loaded successfully
 */
export function autoLoad() {
    try {
        const saved = localStorage.getItem(AUTO_SAVE_KEY);
        if (!saved) {
            console.log('No saved state found');
            return false;
        }

        const state = JSON.parse(saved);

        // Clear current state
        territories.splice(0);
        nodes.splice(0);
        edges.splice(0);

        // Load saved data
        (state.territories || []).forEach(t => territories.push(t));
        (state.nodes || []).forEach(n => nodes.push(n));
        (state.edges || []).forEach(e => edges.push(e));

        console.log('✅ Auto-loaded canvas state from', new Date(state.timestamp).toLocaleString());
        return true;
    } catch (error) {
        console.error('Auto-load failed:', error);
        return false;
    }
}

// ---------- SNAPSHOT (localStorage simple) ----------
/**
 * Save current state to localStorage history
 * @param {string} [name] - Optional snapshot name
 * @throws {Error} If localStorage is unavailable
 */
export function saveSnapshot(name) {
    try {
        const raw = localStorage.getItem('mvp-history');
        const history = raw ? JSON.parse(raw) : [];

        // Ensure deep copy for saving the current state
        const data = {
            territories: JSON.parse(JSON.stringify(territories)),
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
            swot: {...swot},
            ts: Date.now(),
            name
        };

        history.push({
            id: crypto.randomUUID(),
            ts: Date.now(),
            name: name || `snap-${history.length+1}`,
            data
        });

        localStorage.setItem('mvp-history', JSON.stringify(history));
    } catch (error) {
        console.error('Failed to save snapshot:', error);
        throw new Error(`Snapshot save failed: ${error.message}`);
    }
}

/**
 * Load snapshot from history by index
 * @param {number} index - Snapshot index in history array
 * @throws {Error} If snapshot not found or invalid
 */
export function loadSnapshot(index) {
    try {
        const raw = localStorage.getItem('mvp-history');
        if (!raw) {
            throw new Error('No saved history found');
        }

        const history = JSON.parse(raw);
        const snap = history[index];

        if (!snap || !snap.data) {
            throw new Error(`Invalid snapshot at index ${index}`);
        }

        // Clear current state and push new data (maintaining reactivity)
        territories.splice(0);
        nodes.splice(0);
        edges.splice(0);

        (snap.data.territories || []).forEach(t => territories.push(t));
        (snap.data.nodes || []).forEach(n => nodes.push(n));
        (snap.data.edges || []).forEach(e => edges.push(e));

        // Restore SWOT if available
        if (snap.data.swot) {
            Object.assign(swot, snap.data.swot);
        }
    } catch (error) {
        console.error('Failed to load snapshot:', error);
        throw new Error(`Snapshot load failed: ${error.message}`);
    }
}

// ---------- TERRITORY POSITIONING CONSTANTS ----------
const TERRITORY_PADDING = 20;      // px from edges
const TERRITORY_HEADER = 60;       // Space for territory title
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const NODE_SPACING_X = 20;         // Horizontal spacing between nodes
const NODE_SPACING_Y = 20;         // Vertical spacing between nodes
const COLS_PER_TERRITORY = 2;      // Number of columns in territory grid
const TERRITORY_SPACING = 50;      // Space between territories
const TERRITORY_COLS = 3;          // Number of territory columns in layout

/**
 * Calculate optimal territory dimensions based on number of nodes
 * @param {number} nodeCount - Number of nodes in territory
 * @returns {{ width: number, height: number }}
 */
function calculateTerritoryDimensions(nodeCount) {
    const rows = Math.ceil(nodeCount / COLS_PER_TERRITORY);

    const width =
        TERRITORY_PADDING * 2 +
        (COLS_PER_TERRITORY * NODE_WIDTH) +
        ((COLS_PER_TERRITORY - 1) * NODE_SPACING_X);

    const height =
        TERRITORY_HEADER +
        TERRITORY_PADDING * 2 +
        (rows * NODE_HEIGHT) +
        ((rows - 1) * NODE_SPACING_Y);

    // Minimum dimensions
    return {
        width: Math.max(width, 400),
        height: Math.max(height, 350)
    };
}

/**
 * Position a node inside its territory with bounds checking
 * @param {Node} node - Node to position
 * @param {Territory} territory - Parent territory
 * @param {number} indexInTerritory - Index of node within territory
 * @returns {{ x: number, y: number }}
 */
function positionNodeInTerritory(node, territory, indexInTerritory) {
    const col = indexInTerritory % COLS_PER_TERRITORY;
    const row = Math.floor(indexInTerritory / COLS_PER_TERRITORY);

    // Calculate initial position
    const x = territory.x + TERRITORY_PADDING + (col * (NODE_WIDTH + NODE_SPACING_X));
    const y = territory.y + TERRITORY_HEADER + TERRITORY_PADDING + (row * (NODE_HEIGHT + NODE_SPACING_Y));

    // CRITICAL: Ensure node doesn't exceed territory bounds
    const maxX = territory.x + territory.w - NODE_WIDTH - TERRITORY_PADDING;
    const maxY = territory.y + territory.h - NODE_HEIGHT - TERRITORY_PADDING;

    const finalX = Math.min(x, maxX);
    const finalY = Math.min(y, maxY);

    // Visual debugging - check if clamping occurred
    if (x !== finalX || y !== finalY) {
        console.warn(`⚠️ Node "${node.label}" clamped in territory "${territory.label}":`, {
            original: { x, y },
            clamped: { x: finalX, y: finalY },
            territory: {
                bounds: {
                    x: territory.x,
                    y: territory.y,
                    w: territory.w,
                    h: territory.h
                },
                maxAllowed: { x: maxX, y: maxY }
            }
        });
    }

    return { x: finalX, y: finalY };
}

// ---------- NODE MANAGEMENT ----------
/**
 * Delete a node and all its connected edges
 * @param {string} nodeId - ID of the node to delete
 * @returns {boolean} True if node was deleted successfully
 */
export function deleteNode(nodeId) {
    try {
        // Find the node
        const nodeIndex = nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) {
            console.warn(`Node ${nodeId} not found`);
            return false;
        }

        const node = nodes[nodeIndex];
        console.log(`🗑️ Deleting node "${node.label}" (${nodeId})`);

        // Remove the node from the array
        nodes.splice(nodeIndex, 1);

        // Remove all edges connected to this node
        const edgesToRemove = edges.filter(e => e.source === nodeId || e.target === nodeId);
        edgesToRemove.forEach(edge => {
            const edgeIndex = edges.findIndex(e => e.id === edge.id);
            if (edgeIndex !== -1) {
                edges.splice(edgeIndex, 1);
                console.log(`  → Removed edge ${edge.id}`);
            }
        });

        // Remove node from its parent territory's nodeIds
        territories.forEach(territory => {
            if (territory.nodeIds && territory.nodeIds.includes(nodeId)) {
                const idIndex = territory.nodeIds.indexOf(nodeId);
                territory.nodeIds.splice(idIndex, 1);
                console.log(`  → Removed from territory "${territory.label}"`);
            }
        });

        // Auto-save after deletion
        autoSave();

        console.log(`✅ Node deleted successfully (${edgesToRemove.length} edges removed)`);
        return true;
    } catch (error) {
        console.error('Failed to delete node:', error);
        return false;
    }
}

// ---------- STUBS for analysis & map generation ----------
export function runAnalysis() {
    // rule-based stub: fill swot from chatInput for demo
    if (chatInput.value.toLowerCase().includes('ielts')) {
      swot.strengths = 'Good listening';
      swot.weaknesses = 'Timing in writing';
    } else {
      swot.strengths = 'Creative';
    }
    alert('SWOT drafted (stub).');
}

export async function generateMap() {
    if (isGenerating.value) {
        console.warn('Map generation already in progress');
        return;
    }

    try {
        isGenerating.value = true;
        console.log('🚀 Starting map generation...');

        // Clear existing data
        territories.splice(0); nodes.splice(0); edges.splice(0);

        // Call backend API to generate map using LLM (same server, relative path)
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: chatInput.value || 'Create a learning plan for IELTS preparation with listening, reading, writing, and speaking skills'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error || `Server error: ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Check if LLM succeeded
        if (!data.success) {
            throw new Error(data.error || 'Map generation failed');
        }

        // Warn if fallback was used
        if (data.metadata?.fallback) {
            console.warn('⚠️ Using fallback map - LLM response was invalid');
            alert('Warning: Map generation used fallback mode. Results may be limited.');
        }

        const mapData = data.data; // Backend returns { success: true, data: mapJson }

        // LLM returns nodes WITH x,y coordinates - override them with our positioning algorithm
        const llmNodes = mapData.nodes.map(n => ({
            id: n.id || crypto.randomUUID(),
            label: n.label,
            type: n.type || 'concept',
            note: '',
            status: 'todo',
            timestamp: Date.now()
        }));

        const llmEdges = mapData.edges.map(e => ({
            id: e.id || crypto.randomUUID(),
            source: e.source,
            target: e.target,
            type: e.type || 'relationship'
        }));

        // Add to state
        llmNodes.forEach(n => nodes.push(n));
        llmEdges.forEach(e => edges.push(e));

        // Handle territories from LLM FIRST (before positioning nodes)
        if (mapData.territories && mapData.territories.length > 0) {
            console.log('🗺️ Creating territories with dynamic sizing...');

            mapData.territories.forEach((t, index) => {
                const nodeCount = (t.nodeIds || []).length;

                // Calculate dimensions based on node count
                const dimensions = calculateTerritoryDimensions(nodeCount);

                // Position territories in a grid layout
                const col = index % TERRITORY_COLS;
                const row = Math.floor(index / TERRITORY_COLS);

                const territory = {
                    id: t.id || crypto.randomUUID(),
                    label: t.name,
                    x: 100 + col * (dimensions.width + TERRITORY_SPACING),
                    y: 100 + row * (dimensions.height + TERRITORY_SPACING),
                    w: dimensions.width,
                    h: dimensions.height,
                    nodeIds: t.nodeIds || []
                };

                territories.push(territory);

                // Debug log
                console.log(`  📦 Territory "${territory.label}":`, {
                    nodes: nodeCount,
                    dimensions: { w: dimensions.width, h: dimensions.height },
                    position: { x: territory.x, y: territory.y }
                });
            });
        }

        // Position nodes INSIDE their territories
        console.log('\n📍 Positioning nodes within territories...');
        let nodesPositioned = 0;
        let nodesOutside = 0;

        nodes.forEach(node => {
            // Find which territory this node belongs to
            const territory = territories.find(t =>
                t.nodeIds && t.nodeIds.includes(node.id)
            );

            if (territory) {
                // Find index within territory
                const indexInTerritory = territory.nodeIds.indexOf(node.id);

                // Use helper function with bounds checking
                const position = positionNodeInTerritory(node, territory, indexInTerritory);
                node.x = position.x;
                node.y = position.y;

                nodesPositioned++;

                // Debug: verify node is within bounds
                const isWithinBounds =
                    node.x >= territory.x &&
                    node.x + NODE_WIDTH <= territory.x + territory.w &&
                    node.y >= territory.y &&
                    node.y + NODE_HEIGHT <= territory.y + territory.h;

                if (!isWithinBounds) {
                    console.error(`❌ Node "${node.label}" STILL outside territory "${territory.label}"!`, {
                        node: { x: node.x, y: node.y },
                        territory: { x: territory.x, y: territory.y, w: territory.w, h: territory.h }
                    });
                }
            } else {
                // Fallback: random position if no territory
                node.x = Math.random() * 800 + 100;
                node.y = Math.random() * 600 + 100;
                nodesOutside++;
                console.warn(`⚠️ Node "${node.label}" has no territory assignment`);
            }
        });

        console.log(`✓ Positioned ${nodesPositioned} nodes, ${nodesOutside} outside territories`);

        saveSnapshot('auto-generate');
        autoSave(); // Auto-save after successful generation
        console.log('✅ Map generation complete!');
        console.log(`   → ${territories.length} territories`);
        console.log(`   → ${nodes.length} nodes`);
        console.log(`   → ${edges.length} edges`);
    } catch (error) {
        console.error('❌ Map generation failed:', error);

        // Show user-friendly error message
        let userMessage = 'Failed to generate map. ';

        if (error.message.includes('Rate limit') || error.message.includes('busy')) {
            userMessage += 'The AI service is currently busy. Please wait a moment and try again.';
        } else if (error.message.includes('API key') || error.message.includes('not configured')) {
            userMessage += 'API configuration error. Please check your API keys.';
        } else if (error.message.includes('Invalid map structure')) {
            userMessage += 'The AI returned an invalid response. Please try a different prompt.';
        } else {
            userMessage += error.message;
        }

        alert(userMessage);

        // Re-throw to prevent partial state
        throw error;
    } finally {
        isGenerating.value = false;
    }
}

export function useState() {
    return {
        // Data arrays
        territories, nodes, edges,
        // Feature state
        chatInput, swot, isGenerating,
        // Functions
        saveSnapshot, loadSnapshot, runAnalysis, generateMap,
        autoSave, autoLoad, deleteNode
    }
}