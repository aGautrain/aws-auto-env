const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Gets the path to AWS credentials file
 * @returns {string} Path to credentials file
 */
function getCredentialsPath() {
  return path.join(os.homedir(), '.aws', 'credentials');
}

/**
 * Gets the path to AWS config file
 * @returns {string} Path to config file
 */
function getConfigPath() {
  return path.join(os.homedir(), '.aws', 'config');
}

/**
 * Parses AWS INI-style config file and extracts profile names
 * @param {string} filePath - Path to the config file
 * @returns {string[]} Array of profile names
 */
function parseProfilesFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const profiles = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Match [profile_name] or [profile profile_name]
      const match = trimmed.match(/^\[(?:profile\s+)?([^\]]+)\]$/);
      if (match) {
        profiles.push(match[1]);
      }
    }

    return profiles;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Gets all available AWS profiles from credentials and config files
 * @returns {string[]} Array of unique profile names, sorted alphabetically
 */
function getAvailableProfiles() {
  const credentialsProfiles = module.exports.parseProfilesFromFile(module.exports.getCredentialsPath());
  const configProfiles = module.exports.parseProfilesFromFile(module.exports.getConfigPath());

  // Combine and deduplicate profiles
  const allProfiles = [...new Set([...credentialsProfiles, ...configProfiles])];

  return allProfiles.sort();
}

module.exports = {
  getAvailableProfiles,
  getCredentialsPath,
  getConfigPath,
  parseProfilesFromFile
};
