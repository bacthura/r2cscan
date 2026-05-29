/**
 * R2C-Scan — Toast Notification System
 * v2.0 — With types and animations
 */

// Toast types with their colors
const TYPES = {
  success: { bg: 'var(--accent)', color: '#000', icon: '✓' },
  error: { bg: 'var(--danger)', color: '#fff', icon: '✕' },
  warning: { bg: 'var(--warning)', color: '#000', icon: '⚠' },
  info: { bg: 'var(--accent2)', color: '#000', icon: 'ℹ' },
  default: { bg: 'var(--accent)', color: '#000', icon: '' }
};

let toastTimer = null;
let toastQueue = [];
let isProcessing = false;

/**
 * Show a toast notification
 * @param {string} msg - Message to display
 * @param {'success'|'error'|'warning'|'info'|'default'} type - Toast type
 */
export default function toast(msg, type = 'default') {
  toastQueue.push({ msg, type });
  if (!isProcessing) processQueue();
}

function processQueue() {
  if (toastQueue.length === 0) { isProcessing = false; return; }
  isProcessing = true;
  const { msg, type } = toastQueue.shift();
  const el = document.getElementById('toast');
  if (!el) return;
  const config = TYPES[type] || TYPES.default;
  el.textContent = `${config.icon} ${msg}`;
  el.style.background = config.bg;
  el.style.color = config.color;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(processQueue, 300);
  }, 2500);
}