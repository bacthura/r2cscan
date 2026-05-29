/**
 * R2C-Scan — Scanner Module
 * v2.0 — QR Code, Barcode, Camera management with html5-qrcode
 */
import toast from './utils/toast.js';

// State
let html5QrCode = null;
let isScanning = false;
let currentFacingMode = 'environment';
let lastScanData = null;
let scanDebounceTimer = null;

// Config
const SCAN_DEBOUNCE_MS = 2000; // Prevent duplicate reads
const SCAN_INTERVAL_MS = 500;

/**
 * Initializes the scanner with html5-qrcode
 * @returns {Promise<boolean>} Whether initialization succeeded
 */
export async function initScanner() {
  try {
    // Dynamically import html5-qrcode from CDN
    if (typeof Html5Qrcode === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js');
    }
    return true;
  } catch (err) {
    console.error('❌ Failed to load scanner library:', err);
    return false;
  }
}

/**
 * Load a script dynamically
 * @param {string} src
 * @returns {Promise<void>}
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Start scanning with html5-qrcode
 * @param {string} elementId - ID of the container element
 * @param {function} onResult - Callback when code is scanned
 * @returns {Promise<boolean>}
 */
export async function startScanner(elementId, onResult) {
  if (isScanning) {
    console.log('⚠️ Scanner already running');
    return true;
  }

  try {
    const loaded = await initScanner();
    if (!loaded) {
      toast('Erro ao carregar scanner', 'error');
      return false;
    }

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    html5QrCode = new Html5Qrcode(elementId);

    await html5QrCode.start(
      { facingMode: currentFacingMode },
      config,
      (decodedText) => {
        // Debounce to prevent duplicate reads
        if (lastScanData === decodedText) return;
        clearTimeout(scanDebounceTimer);
        scanDebounceTimer = setTimeout(() => { lastScanData = null; }, SCAN_DEBOUNCE_MS);
        lastScanData = decodedText;

        // Vibrate on mobile
        if (navigator.vibrate) navigator.vibrate(100);

        // Play beep sound
        playBeep();

        // Callback
        if (onResult) onResult(decodedText);
      },
      (errorMessage) => {
        // Ignore continuous scan errors (html5-qrcode logs many of these)
        if (errorMessage && errorMessage.includes('NotFoundException')) return;
      }
    );

    isScanning = true;
    console.log('✅ Scanner started successfully');
    return true;
  } catch (err) {
    console.error('❌ Scanner start error:', err);
    toast('Erro ao iniciar câmera', 'error');
    // Try fallback with different facing mode
    if (currentFacingMode === 'environment') {
      currentFacingMode = 'user';
      return startScanner(elementId, onResult);
    }
    return false;
  }
}

/**
 * Stop the scanner
 */
export function stopScanner() {
  if (html5QrCode) {
    try {
      html5QrCode.stop().catch(() => {});
      html5QrCode = null;
    } catch (err) {
      // Ignore stop errors
    }
  }
  isScanning = false;
  lastScanData = null;
  clearTimeout(scanDebounceTimer);
}

/**
 * Toggle between front and back camera
 */
export function toggleCamera() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  return currentFacingMode;
}

/**
 * Get current camera facing mode
 */
export function getFacingMode() {
  return currentFacingMode;
}

/**
 * Play a short beep sound using Web Audio API
 */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    gain.gain.value = 0.3;
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (err) {
    // Beep is optional, ignore errors
  }
}

/**
 * Request camera permission explicitly
 * @returns {Promise<boolean>}
 */
export async function requestCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: currentFacingMode } }
    });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (err) {
    console.error('❌ Camera permission denied:', err);
    return false;
  }
}

export default {
  initScanner, startScanner, stopScanner,
  toggleCamera, getFacingMode, requestCameraPermission
};