import EventEmitter from 'events';

class AgentEventEmitter extends EventEmitter {}
export const agentEvents = new AgentEventEmitter();

const MAX_HISTORY = 100;
const logHistory = [];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

const AGENT_COLORS = {
  Orchestrator: COLORS.magenta,
  'Global-Agent': COLORS.blue,
  'TR-Agent': COLORS.red,
  Validator: COLORS.yellow,
  Newsletter: COLORS.green,
  System: COLORS.cyan
};

export const logger = {
  log(agent, message, data = null, level = 'info') {
    const timestamp = new Date().toISOString();
    const agentColor = AGENT_COLORS[agent] || COLORS.cyan;
    const levelColor = level === 'error' ? COLORS.red : level === 'warn' ? COLORS.yellow : COLORS.bright;

    const logEntry = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      timestamp,
      agent,
      level,
      message,
      data
    };

    logHistory.push(logEntry);
    if (logHistory.length > MAX_HISTORY) {
      logHistory.shift();
    }

    // Terminal output
    console.log(
      `${COLORS.dim}[${timestamp.substring(11, 19)}]${COLORS.reset} ` +
      `${agentColor}[${agent}]${COLORS.reset} ` +
      `${levelColor}${message}${COLORS.reset}` +
      (data ? ` ${COLORS.dim}${JSON.stringify(data)}${COLORS.reset}` : '')
    );

    // Emit event for real-time SSE
    agentEvents.emit('log', logEntry);

    return logEntry;
  },

  info(agent, message, data = null) {
    return this.log(agent, message, data, 'info');
  },

  success(agent, message, data = null) {
    return this.log(agent, `✓ ${message}`, data, 'success');
  },

  warn(agent, message, data = null) {
    return this.log(agent, `⚠ ${message}`, data, 'warn');
  },

  error(agent, message, error = null) {
    const data = error ? (error.message || String(error)) : null;
    return this.log(agent, `✗ ${message}`, data, 'error');
  },

  getHistory() {
    return [...logHistory];
  },

  clearHistory() {
    logHistory.length = 0;
  }
};
