
import { reactive, ref } from 'vue';

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

export function generateMap() {
    // simple demo map so the canvas has nodes/territories
    territories.splice(0); nodes.splice(0); edges.splice(0);
    // add two territories
    const t1 = { id: crypto.randomUUID(), label: 'Listening', x: 40, y: 40, w: 360, h: 300 };
    const t2 = { id: crypto.randomUUID(), label: 'Writing', x: 440, y: 40, w: 360, h: 300 };
    territories.push(t1, t2);
    // nodes
    const n1 = { id: crypto.randomUUID(), label: 'Baseline test', x: t1.x + 120, y: t1.y + 80, territoryId: t1.id, note: '', status:'todo', timestamp: Date.now() };
    const n2 = { id: crypto.randomUUID(), label: 'Targeted drills', x: t1.x + 220, y: t1.y + 160, territoryId: t1.id, note: '', status:'todo', timestamp: Date.now() };
    const n3 = { id: crypto.randomUUID(), label: 'Task 1 practice', x: t2.x + 120, y: t2.y + 80, territoryId: t2.id, note: '', status:'todo', timestamp: Date.now() };
    nodes.push(n1, n2, n3);
    edges.push({ id: crypto.randomUUID(), source: n1.id, target: n2.id });
    // optional autosnapshot here
    saveSnapshot('auto-generate');
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