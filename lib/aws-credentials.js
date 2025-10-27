const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Gets AWS credentials for a specific profile using AWS CLI
 * @param {string} profileName - AWS profile name
 * @returns {Object} Credentials object containing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and optionally AWS_SESSION_TOKEN
 * @throws {Error} If the AWS CLI command fails or profile doesn't exist
 */
function getCredentials(profileName) {
  if (!profileName) {
    throw new Error("Profile name is required");
  }

  try {
    // Execute AWS CLI command to export credentials
    const command = `aws configure export-credentials --profile ${profileName} --format process | jq '{
      AWS_ACCESS_KEY_ID: .AccessKeyId,
      AWS_SECRET_ACCESS_KEY: .SecretAccessKey,
      AWS_SESSION_TOKEN: .SessionToken,
      EXPIRATION: .Expiration
    }'`;
    const output = execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Parse the JSON output
    const credentials = JSON.parse(output.trim());

    // Validate that we got the required fields
    if (!credentials.AWS_ACCESS_KEY_ID || !credentials.AWS_SECRET_ACCESS_KEY) {
      throw new Error("Invalid credentials format returned from AWS CLI");
    }

    return credentials;
  } catch (error) {
    // Check if it's a command execution error
    if (error.status !== undefined) {
      throw new Error(
        `Failed to get credentials for profile "${profileName}": ${error.message}`
      );
    }
    // Re-throw parsing or validation errors
    throw error;
  }
}

/**
 * Checks if AWS CLI is available
 * @returns {boolean} True if AWS CLI is installed and accessible
 */
function isAwsCliAvailable() {
  try {
    execSync("aws --version", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets credentials for a profile and formats them as environment variables
 * @param {string} profileName - AWS profile name
 * @returns {Object} Object with environment variable names as keys
 */
function getCredentialsAsEnvVars(profileName) {
  const credentials = getCredentials(profileName);

  // Return in a format suitable for .env files
  return {
    AWS_ACCESS_KEY_ID: credentials.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: credentials.AWS_SECRET_ACCESS_KEY,
    ...(credentials.AWS_SESSION_TOKEN && {
      AWS_SESSION_TOKEN: credentials.AWS_SESSION_TOKEN,
    }),
  };
}

/**
 * Writes credentials to a .env file, updating existing keys or appending new ones
 * @param {Object} credentials - Credentials object with key-value pairs
 * @param {string} filePath - Path to the .env file
 * @throws {Error} If file path is not provided or file operations fail
 */
function writeCredentialsToFile(credentials, filePath) {
  if (!filePath) {
    throw new Error("File path is required");
  }

  if (!credentials || typeof credentials !== "object") {
    throw new Error("Credentials must be an object");
  }

  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let lines = [];
    let existingKeys = new Set();

    // Read existing file if it exists
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      lines = content.split("\n");

      // Update existing keys
      lines = lines.map((line) => {
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith("#")) {
          return line;
        }

        // Parse key=value
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          existingKeys.add(key);

          // If this key is in our credentials, update it
          if (credentials.hasOwnProperty(key)) {
            return `${key}=${credentials[key]}`;
          }
        }

        return line;
      });
    }

    // Append new keys that don't exist
    const newKeys = Object.keys(credentials).filter(
      (key) => !existingKeys.has(key)
    );
    if (newKeys.length > 0) {
      // Add a newline before appending if file exists and doesn't end with newline
      if (lines.length > 0 && lines[lines.length - 1] !== "") {
        lines.push("");
      }

      newKeys.forEach((key) => {
        lines.push(`${key}=${credentials[key]}`);
      });
    }

    // Write back to file
    const content = lines.join("\n");
    fs.writeFileSync(filePath, content, "utf8");
  } catch (error) {
    throw new Error(`Failed to write credentials to file: ${error.message}`);
  }
}

module.exports = {
  getCredentials,
  isAwsCliAvailable,
  getCredentialsAsEnvVars,
  writeCredentialsToFile,
};
