const fs = require('fs');
const path = require('path');
const { getLoggingConfig } = require('./settings-manager');

/**
 * Ensures the directory for the log file exists
 * @param {string} filePath - Path to the log file
 */
function ensureLogDirectory(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Logs a message to the configured log file if logging is enabled
 * @param {string} message - Message to log
 */
function log(message) {
  const config = getLoggingConfig();

  if (!config.enabled) {
    return;
  }

  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    ensureLogDirectory(config.logFile);
    fs.appendFileSync(config.logFile, logMessage, 'utf8');
  } catch (error) {
    console.error('Error writing to log file:', error.message);
  }
}

/**
 * Logs command execution
 * @param {string} command - The command that was executed
 */
function logCommand(command) {
  log(`Command executed: ${command}`);
}

/**
 * Logs an error
 * @param {string} error - The error message
 */
function logError(error) {
  log(`ERROR: ${error}`);
}

module.exports = {
  log,
  logCommand,
  logError
};
