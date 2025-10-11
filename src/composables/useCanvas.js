// src/composables/useCanvas.js
import { reactive, ref, onMounted, onUnmounted } from 'vue';

/**
 * @typedef {Object} ViewBox
 * @property {number} x - X offset
 * @property {number} y - Y offset
 * @property {number} w - Width
 * @property {number} h - Height
 */

/**
 * @typedef {Object} Point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

const initView = reactive({ x: 0, y: 0, w: 1600, h: 900 });

/** @type {import('vue').UnwrapRef<ViewBox>} */
export const viewBox = reactive({ x: initView.x, y: initView.y, w: initView.w, h: initView.h });

const isPanning = ref(false);
const lastPan = reactive({ x: 0, y: 0 });

// ---------- UTIL: coord conversion (EXPORTED) ----------
/**
 * Convert screen mouse event to world coordinates
 * @param {MouseEvent} e - Mouse event
 * @returns {Point} World coordinates
 */
export function svgToWorld(e) {
  const svg = document.querySelector('svg');
  if (!svg) {
    console.warn('SVG element not found');
    return { x: 0, y: 0 };
  }

  const r = svg.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;

  return {
    x: viewBox.x + px * viewBox.w,
    y: viewBox.y + py * viewBox.h
  };
}

/**
 * Convert world node coordinates to screen position
 * @param {Object} node - Node with x, y properties
 * @param {number} node.x - World X coordinate
 * @param {number} node.y - World Y coordinate
 * @returns {Point & {rect: DOMRect}} Screen coordinates with SVG rect
 */
export function worldToScreen(node) {
  const svg = document.querySelector('svg');
  if (!svg) {
    console.warn('SVG element not found');
    return { x: 0, y: 0, rect: null };
  }

  const r = svg.getBoundingClientRect();
  const sx = ((node.x - viewBox.x) / viewBox.w) * r.width + r.left;
  const sy = ((node.y - viewBox.y) / viewBox.h) * r.height + r.top;

  return { x: sx, y: sy, rect: r };
}

// ---------- PAN (canvas dragging) ----------
export function onPanStart(e) {
  isPanning.value = true;
  lastPan.x = e.clientX;
  lastPan.y = e.clientY;
}
export function onPanMove(e) {
  if (!isPanning.value) return;
  const svg = e.currentTarget; 
  const dx = (e.clientX - lastPan.x) * (viewBox.w / svg.clientWidth);
  const dy = (e.clientY - lastPan.y) * (viewBox.h / svg.clientHeight);
  viewBox.x -= dx;
  viewBox.y -= dy;
  lastPan.x = e.clientX;
  lastPan.y = e.clientY;
}
export function onPanEnd() { isPanning.value = false; }

// ---------- WHEEL (zoom at cursor) ----------
export const onWheel = (event) => {
  const svg = event.currentTarget;
  const rect = svg.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const scaleFactor = event.deltaY < 0 ? 0.9 : 1.1; // zoom in when scroll up
  const worldMx = viewBox.x + (mouseX / rect.width) * viewBox.w;
  const worldMy = viewBox.y + (mouseY / rect.height) * viewBox.h;

  // new size
  const newW = viewBox.w * scaleFactor;
  const newH = viewBox.h * scaleFactor;
  // keep the zoom centered on mouse
  viewBox.x = worldMx - (mouseX / rect.width) * newW;
  viewBox.y = worldMy - (mouseY / rect.height) * newH;
  viewBox.w = newW;
  viewBox.h = newH;
};

// ---------- ZOOM TO NODE (smooth-ish) ----------
export function zoomToNode(node, scale = 2, duration = 300) {
  const start = { x: viewBox.x, y: viewBox.y, w: viewBox.w, h: viewBox.h };
  const cx = node.x, cy = node.y;
  const targetW = initView.w / scale;
  const targetH = initView.h / scale;
  const target = { x: cx - targetW / 2, y: cy - targetH / 2, w: targetW, h: targetH };
  const t0 = performance.now();
  function step(t) {
    const p = Math.min(1, (t - t0) / duration);
    const e = 1 - Math.pow(1 - p, 2); // easeOutQuad
    viewBox.x = start.x + (target.x - start.x) * e;
    viewBox.y = start.y + (target.y - start.y) * e;
    viewBox.w = start.w + (target.w - start.w) * e;
    viewBox.h = start.h + (target.h - start.h) * e;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


export function useCanvas() {
    return {
        viewBox, isPanning,
        onPanStart, onPanMove, onPanEnd, onWheel,
        svgToWorld, worldToScreen, zoomToNode,
    }
}