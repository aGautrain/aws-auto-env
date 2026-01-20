const fs = require('fs');
const path = require('path');

let SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

/**
 * Sets the settings file path (primarily for testing)
 * @param {string} filePath - Path to settings file
 */
function setSettingsFile(filePath) {
  SETTINGS_FILE = filePath;
}

/**
 * Default settings structure
 */
const DEFAULT_SETTINGS = {
  mappings: {},
  postmanMappings: {},
  postman: {
    apiKey: null
  },
  logging: {
    enabled: false,
    logFile: './aws-auto-env.log'
  }
};

/**
 * Reads settings from settings.json
 * @returns {Object} Settings object
 */
function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      writeSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings:', error.message);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Writes settings to settings.json
 * @param {Object} settings - Settings object to write
 */
function writeSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing settings:', error.message);
    throw error;
  }
}

/**
 * Gets all mappings
 * @returns {Object} Mappings object
 */
function getMappings() {
  const settings = readSettings();
  return settings.mappings || {};
}

/**
 * Adds a new mapping
 * @param {string} envPath - Path to .env file
 * @param {string} awsProfile - AWS profile name
 */
function addMapping(envPath, awsProfile) {
  const settings = readSettings();
  settings.mappings[envPath] = awsProfile;
  writeSettings(settings);
}

/**
 * Removes a mapping
 * @param {string} envPath - Path to .env file
 * @returns {boolean} True if mapping was removed, false if it didn't exist
 */
function removeMapping(envPath) {
  const settings = readSettings();
  if (settings.mappings[envPath]) {
    delete settings.mappings[envPath];
    writeSettings(settings);
    return true;
  }
  return false;
}

/**
 * Gets logging configuration
 * @returns {Object} Logging configuration
 */
function getLoggingConfig() {
  const settings = readSettings();
  return settings.logging || DEFAULT_SETTINGS.logging;
}

/**
 * Enables logging
 */
function enableLogging() {
  const settings = readSettings();
  settings.logging.enabled = true;
  writeSettings(settings);
}

/**
 * Disables logging
 */
function disableLogging() {
  const settings = readSettings();
  settings.logging.enabled = false;
  writeSettings(settings);
}

/**
 * Sets log file path
 * @param {string} filePath - Path to log file
 */
function setLogFile(filePath) {
  const settings = readSettings();
  settings.logging.logFile = filePath;
  writeSettings(settings);
}

/**
 * Gets Postman API key
 * @returns {string|null} Postman API key
 */
function getPostmanApiKey() {
  const settings = readSettings();
  // Environment variable takes precedence
  return process.env.POSTMAN_API_KEY || settings.postman?.apiKey || null;
}

/**
 * Sets Postman API key
 * @param {string} apiKey - Postman API key
 */
function setPostmanApiKey(apiKey) {
  const settings = readSettings();
  if (!settings.postman) {
    settings.postman = {};
  }
  settings.postman.apiKey = apiKey;
  writeSettings(settings);
}

/**
 * Gets all Postman mappings
 * @returns {Object} Postman mappings object { environmentId: { awsProfile, environmentName } }
 */
function getPostmanMappings() {
  const settings = readSettings();
  return settings.postmanMappings || {};
}

/**
 * Adds a Postman mapping
 * @param {string} environmentId - Postman environment ID
 * @param {Object} config - { awsProfile, environmentName }
 */
function addPostmanMapping(environmentId, config) {
  const settings = readSettings();
  if (!settings.postmanMappings) {
    settings.postmanMappings = {};
  }
  settings.postmanMappings[environmentId] = {
    awsProfile: config.awsProfile,
    environmentName: config.environmentName || null
  };
  writeSettings(settings);
}

/**
 * Removes a Postman mapping
 * @param {string} environmentId - Postman environment ID
 * @returns {boolean} True if mapping was removed, false if it didn't exist
 */
function removePostmanMapping(environmentId) {
  const settings = readSettings();
  if (settings.postmanMappings && settings.postmanMappings[environmentId]) {
    delete settings.postmanMappings[environmentId];
    writeSettings(settings);
    return true;
  }
  return false;
}

/**
 * Updates the environment name for an existing Postman mapping
 * @param {string} environmentId - Postman environment ID
 * @param {string} environmentName - New environment name
 */
function updatePostmanMappingName(environmentId, environmentName) {
  const settings = readSettings();
  if (settings.postmanMappings && settings.postmanMappings[environmentId]) {
    settings.postmanMappings[environmentId].environmentName = environmentName;
    writeSettings(settings);
  }
}

module.exports = {
  readSettings,
  writeSettings,
  getMappings,
  addMapping,
  removeMapping,
  getLoggingConfig,
  enableLogging,
  disableLogging,
  setLogFile,
  setSettingsFile,
  SETTINGS_FILE,
  // Postman functions
  getPostmanApiKey,
  setPostmanApiKey,
  getPostmanMappings,
  addPostmanMapping,
  removePostmanMapping,
  updatePostmanMappingName
};
