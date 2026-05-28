/**
 * Simple logger utility
 * R2C-Scan v2.0
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function timestamp() {
  return new Date().toLocaleTimeString('pt-BR');
}

export const logger = {
  info(msg, ...args) {
    console.log(`[${timestamp()}] ${colors.cyan}INFO${colors.reset}  ${msg}`, ...args);
  },
  success(msg, ...args) {
    console.log(`[${timestamp()}] ${colors.green}OK${colors.reset}    ${msg}`, ...args);
  },
  warn(msg, ...args) {
    console.log(`[${timestamp()}] ${colors.yellow}WARN${colors.reset}  ${msg}`, ...args);
  },
  error(msg, ...args) {
    console.log(`[${timestamp()}] ${colors.red}ERROR${colors.reset} ${msg}`, ...args);
  },
  route(method, path, status, duration) {
    const color = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
    console.log(`[${timestamp()}] ${colors.blue}${method.padEnd(6)}${colors.reset} ${path.padEnd(40)} ${color}${status}${colors.reset} ${duration}ms`);
  }
};

export default logger;