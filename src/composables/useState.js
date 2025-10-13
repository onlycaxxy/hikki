
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

/** @type {import('vue').UnwrapRef<SWOT>} */
export const swot = reactive({ strengths:'', weaknesses:'', opportunities:'', threats:'' });

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
    try {
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
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
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
            const territorySpacing = 50;
            const territoryWidth = 400;
            const territoryHeight = 350;

            mapData.territories.forEach((t, index) => {
                // Position territories in a grid layout
                const col = index % 3; // 3 columns
                const row = Math.floor(index / 3);

                territories.push({
                    id: t.id || crypto.randomUUID(),
                    label: t.name,
                    x: 100 + col * (territoryWidth + territorySpacing),
                    y: 100 + row * (territoryHeight + territorySpacing),
                    w: territoryWidth,
                    h: territoryHeight,
                    nodeIds: t.nodeIds || []
                });
            });
        }

        // Position nodes INSIDE their territories
        nodes.forEach(node => {
            // Find which territory this node belongs to
            const territory = territories.find(t =>
                t.nodeIds && t.nodeIds.includes(node.id)
            );

            if (territory) {
                // Find index within territory
                const indexInTerritory = territory.nodeIds.indexOf(node.id);
                const nodesInTerritory = territory.nodeIds.length;

                // Grid layout within territory (2 columns)
                const col = indexInTerritory % 2;
                const row = Math.floor(indexInTerritory / 2);

                // Position node inside territory with padding
                node.x = territory.x + 80 + col * 120;
                node.y = territory.y + 60 + row * 70;
            } else {
                // Fallback: random position if no territory
                node.x = Math.random() * 800 + 100;
                node.y = Math.random() * 600 + 100;
            }
        });

        saveSnapshot('auto-generate');
        console.log('✓ Map generated from LLM with algorithmic positioning');
    } catch (error) {
        console.error('Map generation failed:', error);
        alert(`Failed to generate map: ${error.message}`);
    }
}

export function useState() {
    return {
        // Data arrays
        territories, nodes, edges,
        // Feature state
        chatInput, swot,
        // Functions
        saveSnapshot, loadSnapshot, runAnalysis, generateMap
    }
}