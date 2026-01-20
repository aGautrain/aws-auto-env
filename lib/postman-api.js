const https = require("https");

const BASE_URL = "api.getpostman.com";

let apiKey = null;

/**
 * Sets the Postman API key
 * @param {string} key - Postman API key
 */
function setApiKey(key) {
  apiKey = key;
}

/**
 * Gets the current API key
 * @returns {string|null} Current API key
 */
function getApiKey() {
  return apiKey;
}

/**
 * Makes an HTTPS request to the Postman API
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object|null} body - Request body (for PUT/POST)
 * @returns {Promise<Object>} Response data
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error("Postman API key not set. Use 'postman key <api-key>' to set it."));
      return;
    }

    const options = {
      hostname: BASE_URL,
      path: path,
      method: method,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);

          if (res.statusCode >= 400) {
            const errorMsg = parsed.error?.message || parsed.message || `HTTP ${res.statusCode}`;
            reject(new Error(errorMsg));
            return;
          }

          resolve(parsed);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Lists all Postman environments
 * @returns {Promise<Array>} List of environments with id and name
 */
async function listEnvironments() {
  const response = await makeRequest("GET", "/environments");
  return response.environments || [];
}

/**
 * Gets a single environment with its variables
 * @param {string} environmentId - Environment ID
 * @returns {Promise<Object>} Environment details including variables
 */
async function getEnvironment(environmentId) {
  if (!environmentId) {
    throw new Error("Environment ID is required");
  }

  const response = await makeRequest("GET", `/environments/${environmentId}`);
  return response.environment;
}

/**
 * Gets environment name by ID (for display purposes)
 * @param {string} environmentId - Environment ID
 * @returns {Promise<string|null>} Environment name or null if not found
 */
async function getEnvironmentName(environmentId) {
  try {
    const environment = await getEnvironment(environmentId);
    return environment?.name || null;
  } catch (err) {
    return null;
  }
}

/**
 * Updates an environment with new values
 * @param {string} environmentId - Environment ID
 * @param {string} name - Environment name
 * @param {Array} values - Array of { key, value, enabled } objects
 * @returns {Promise<Object>} Updated environment
 */
async function updateEnvironment(environmentId, name, values) {
  if (!environmentId) {
    throw new Error("Environment ID is required");
  }

  const body = {
    environment: {
      name: name,
      values: values,
    },
  };

  const response = await makeRequest("PUT", `/environments/${environmentId}`, body);
  return response.environment;
}

/**
 * AWS credential variable names used in Postman (lowercase as per user's setup)
 */
const AWS_VAR_NAMES = ["aws_access_key_id", "aws_access_secret", "aws_session_token"];

/**
 * Updates specific AWS variables in a Postman environment
 * Preserves existing non-AWS variables
 * @param {string} environmentId - Environment ID
 * @param {Object} credentials - { aws_access_key_id, aws_access_secret, aws_session_token }
 * @returns {Promise<Object>} Result with updated environment name
 */
async function updateAwsCredentials(environmentId, credentials) {
  // 1. Get current environment to preserve existing variables
  const currentEnv = await getEnvironment(environmentId);

  if (!currentEnv) {
    throw new Error(`Environment ${environmentId} not found`);
  }

  // 2. Filter out existing AWS variables
  const existingValues = (currentEnv.values || []).filter(
    (v) => !AWS_VAR_NAMES.includes(v.key)
  );

  // 3. Deduplicate existing values by key (keep the last occurrence)
  const seenKeys = new Map();
  for (const variable of existingValues) {
    seenKeys.set(variable.key, variable);
  }
  const deduplicatedValues = Array.from(seenKeys.values());

  // 4. Add new AWS credential variables
  const awsValues = [];

  if (credentials.aws_access_key_id) {
    awsValues.push({
      key: "aws_access_key_id",
      value: credentials.aws_access_key_id,
      enabled: true,
    });
  }

  if (credentials.aws_access_secret) {
    awsValues.push({
      key: "aws_access_secret",
      value: credentials.aws_access_secret,
      enabled: true,
    });
  }

  if (credentials.aws_session_token) {
    awsValues.push({
      key: "aws_session_token",
      value: credentials.aws_session_token,
      enabled: true,
    });
  }

  // 5. Merge deduplicated variables with new AWS variables
  const mergedValues = [...deduplicatedValues, ...awsValues];

  // 6. PUT the updated environment
  await updateEnvironment(environmentId, currentEnv.name, mergedValues);

  return {
    environmentName: currentEnv.name,
    environmentId: environmentId,
  };
}

module.exports = {
  setApiKey,
  getApiKey,
  listEnvironments,
  getEnvironment,
  getEnvironmentName,
  updateEnvironment,
  updateAwsCredentials,
  AWS_VAR_NAMES,
  // Exported for testing
  makeRequest,
};
