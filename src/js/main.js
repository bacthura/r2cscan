/**
 * R2C-Scan — Entry Point
 * v2.0 — ES Module entry that bootstraps the app
 */
import { init } from './app.js';

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}