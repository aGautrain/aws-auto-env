#!/usr/bin/env node

const readline = require("readline");
const settingsManager = require("./lib/settings-manager");
const awsProfiles = require("./lib/aws-profiles");
const awsCredentials = require("./lib/aws-credentials");
const postmanApi = require("./lib/postman-api");
const logger = require("./lib/logger");

/**
 * Creates and returns a readline interface
 * @returns {readline.Interface}
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });
}

/**
 * Handles the 'list' command
 */
function handleList() {
  const mappings = settingsManager.getMappings();
  const entries = Object.entries(mappings);

  if (entries.length === 0) {
    console.log("No mappings configured.");
    return;
  }

  console.log("\nConfigured Mappings:");
  console.log("─".repeat(60));
  entries.forEach(([envPath, profile]) => {
    console.log(`${envPath} → ${profile}`);
  });
  console.log("─".repeat(60));
}

/**
 * Handles the 'add' command
 * @param {string} envPath - Path to .env file
 * @param {string} awsProfile - AWS profile name
 */
function handleAdd(envPath, awsProfile) {
  if (!envPath || !awsProfile) {
    console.log("Error: Both <env-file-path> and <aws-profile> are required.");
    console.log("Usage: add <env-file-path> <aws-profile>");
    return;
  }

  try {
    settingsManager.addMapping(envPath, awsProfile);
    console.log(`✓ Added mapping: ${envPath} → ${awsProfile}`);
    logger.logCommand(`add ${envPath} ${awsProfile}`);
  } catch (error) {
    console.log(`Error adding mapping: ${error.message}`);
    logger.logError(`Failed to add mapping: ${error.message}`);
  }
}

/**
 * Handles the 'remove' command
 * @param {string} envPath - Path to .env file
 */
function handleRemove(envPath) {
  if (!envPath) {
    console.log("Error: <env-file-path> is required.");
    console.log("Usage: remove <env-file-path>");
    return;
  }

  try {
    const removed = settingsManager.removeMapping(envPath);
    if (removed) {
      console.log(`✓ Removed mapping for: ${envPath}`);
      logger.logCommand(`remove ${envPath}`);
    } else {
      console.log(`No mapping found for: ${envPath}`);
    }
  } catch (error) {
    console.log(`Error removing mapping: ${error.message}`);
    logger.logError(`Failed to remove mapping: ${error.message}`);
  }
}

/**
 * Handles the 'profiles' command
 */
function handleProfiles() {
  try {
    const profiles = awsProfiles.getAvailableProfiles();

    if (profiles.length === 0) {
      console.log("No AWS profiles found.");
      console.log("Make sure AWS CLI is configured with profiles.");
      return;
    }

    console.log("\nAvailable AWS Profiles:");
    console.log("─".repeat(60));
    profiles.forEach((profile) => {
      console.log(`  ${profile}`);
    });
    console.log("─".repeat(60));
    logger.logCommand("profiles");
  } catch (error) {
    console.log(`Error reading AWS profiles: ${error.message}`);
    logger.logError(`Failed to read AWS profiles: ${error.message}`);
  }
}

/**
 * Handles the 'settings' command
 */
function handleSettings() {
  try {
    const settings = settingsManager.readSettings();
    console.log("\nCurrent Settings:");
    console.log("─".repeat(60));
    console.log(JSON.stringify(settings, null, 2));
    console.log("─".repeat(60));
    logger.logCommand("settings");
  } catch (error) {
    console.log(`Error reading settings: ${error.message}`);
    logger.logError(`Failed to read settings: ${error.message}`);
  }
}

/**
 * Handles log commands
 * @param {string[]} args - Command arguments
 */
function handleLog(args) {
  const subcommand = args[0];

  try {
    switch (subcommand) {
      case "enable":
        settingsManager.enableLogging();
        console.log("✓ Logging enabled");
        logger.logCommand("log enable");
        break;

      case "disable":
        settingsManager.disableLogging();
        console.log("✓ Logging disabled");
        break;

      case "file":
        const filePath = args[1];
        if (!filePath) {
          console.log("Error: <path> is required.");
          console.log("Usage: log file <path>");
          return;
        }
        settingsManager.setLogFile(filePath);
        console.log(`✓ Log file set to: ${filePath}`);
        logger.logCommand(`log file ${filePath}`);
        break;

      default:
        console.log(
          "Unknown log command. Available: enable, disable, file <path>"
        );
    }
  } catch (error) {
    console.log(`Error with log command: ${error.message}`);
    logger.logError(`Failed log command: ${error.message}`);
  }
}

/**
 * Handles the 'refresh' command
 * Syncs all mapped .env files with their AWS profile credentials
 */
function handleRefresh() {
  try {
    const mappings = settingsManager.getMappings();
    const entries = Object.entries(mappings);

    if (entries.length === 0) {
      console.log(
        "No mappings configured. Use 'add' to create mappings first."
      );
      return;
    }

    // Check if AWS CLI is available
    if (!awsCredentials.isAwsCliAvailable()) {
      console.log("Error: AWS CLI is not available.");
      console.log("Please install AWS CLI to use this command.");
      logger.logError("AWS CLI not available for refresh command");
      return;
    }

    // Build a map of profile to list of filepaths
    const profileToFiles = {};
    entries.forEach(([envPath, profile]) => {
      if (!profileToFiles[profile]) {
        profileToFiles[profile] = [];
      }
      profileToFiles[profile].push(envPath);
    });

    console.log("\nRefreshing credentials...");
    console.log("─".repeat(60));

    let successCount = 0;
    let errorCount = 0;

    // Process each profile
    Object.entries(profileToFiles).forEach(([profile, filePaths]) => {
      try {
        // Get credentials for this profile
        const credentials = awsCredentials.getCredentialsAsEnvVars(profile);

        // Write credentials to each file mapped to this profile
        filePaths.forEach((filePath) => {
          try {
            awsCredentials.writeCredentialsToFile(credentials, filePath);
            console.log(`✓ Updated ${filePath} (${profile})`);
            successCount++;
          } catch (error) {
            console.log(`✗ Failed to update ${filePath}: ${error.message}`);
            logger.logError(
              `Failed to write credentials to ${filePath}: ${error.message}`
            );
            errorCount++;
          }
        });
      } catch (error) {
        // Failed to get credentials for this profile
        filePaths.forEach((filePath) => {
          console.log(
            `✗ Failed to update ${filePath}: Could not get credentials for profile "${profile}"`
          );
          errorCount++;
        });
        logger.logError(
          `Failed to get credentials for profile "${profile}": ${error.message}`
        );
      }
    });

    console.log("─".repeat(60));
    console.log(
      `Refresh complete: ${successCount} succeeded, ${errorCount} failed`
    );
    logger.logCommand(
      `refresh - ${successCount} succeeded, ${errorCount} failed`
    );
  } catch (error) {
    console.log(`Error during refresh: ${error.message}`);
    logger.logError(`Refresh command failed: ${error.message}`);
  }
}

/**
 * Handles the 'postman key' subcommand
 * @param {string} apiKey - Postman API key
 */
function handlePostmanKey(apiKey) {
  if (!apiKey) {
    const currentKey = settingsManager.getPostmanApiKey();
    if (currentKey) {
      // Mask the key for display
      const masked = currentKey.substring(0, 8) + "..." + currentKey.substring(currentKey.length - 4);
      console.log(`Current Postman API key: ${masked}`);
    } else {
      console.log("No Postman API key configured.");
      console.log("Usage: postman key <api-key>");
    }
    return;
  }

  try {
    settingsManager.setPostmanApiKey(apiKey);
    console.log("✓ Postman API key saved");
    logger.logCommand("postman key <redacted>");
  } catch (error) {
    console.log(`Error saving API key: ${error.message}`);
    logger.logError(`Failed to save Postman API key: ${error.message}`);
  }
}

/**
 * Handles the 'postman envs' subcommand
 */
async function handlePostmanEnvs() {
  try {
    const apiKey = settingsManager.getPostmanApiKey();
    if (!apiKey) {
      console.log("Error: Postman API key not configured.");
      console.log("Usage: postman key <api-key>");
      return;
    }

    postmanApi.setApiKey(apiKey);
    const environments = await postmanApi.listEnvironments();

    if (environments.length === 0) {
      console.log("No Postman environments found.");
      return;
    }

    console.log("\nAvailable Postman Environments:");
    console.log("─".repeat(60));
    environments.forEach((env) => {
      const name = env.name.padEnd(30);
      console.log(`  ${name} ${env.id}`);
    });
    console.log("─".repeat(60));
    logger.logCommand("postman envs");
  } catch (error) {
    console.log(`Error listing environments: ${error.message}`);
    logger.logError(`Failed to list Postman environments: ${error.message}`);
  }
}

/**
 * Handles the 'postman add' subcommand
 * @param {string} environmentId - Postman environment ID
 * @param {string} awsProfile - AWS profile name
 */
async function handlePostmanAdd(environmentId, awsProfile) {
  if (!environmentId || !awsProfile) {
    console.log("Error: Both <environment-id> and <aws-profile> are required.");
    console.log("Usage: postman add <environment-id> <aws-profile>");
    return;
  }

  try {
    const apiKey = settingsManager.getPostmanApiKey();
    if (!apiKey) {
      console.log("Error: Postman API key not configured.");
      console.log("Usage: postman key <api-key>");
      return;
    }

    postmanApi.setApiKey(apiKey);

    // Try to fetch environment name (non-blocking)
    let environmentName = null;
    try {
      environmentName = await postmanApi.getEnvironmentName(environmentId);
    } catch (err) {
      console.log(`Warning: Could not fetch environment name: ${err.message}`);
    }

    settingsManager.addPostmanMapping(environmentId, {
      awsProfile,
      environmentName
    });

    const displayName = environmentName || environmentId;
    console.log(`✓ Mapped Postman env "${displayName}" → AWS profile "${awsProfile}"`);
    logger.logCommand(`postman add ${environmentId} ${awsProfile}`);
  } catch (error) {
    console.log(`Error adding mapping: ${error.message}`);
    logger.logError(`Failed to add Postman mapping: ${error.message}`);
  }
}

/**
 * Handles the 'postman remove' subcommand
 * @param {string} environmentId - Postman environment ID
 */
function handlePostmanRemove(environmentId) {
  if (!environmentId) {
    console.log("Error: <environment-id> is required.");
    console.log("Usage: postman remove <environment-id>");
    return;
  }

  try {
    const removed = settingsManager.removePostmanMapping(environmentId);
    if (removed) {
      console.log(`✓ Removed Postman mapping for: ${environmentId}`);
      logger.logCommand(`postman remove ${environmentId}`);
    } else {
      console.log(`No Postman mapping found for: ${environmentId}`);
    }
  } catch (error) {
    console.log(`Error removing mapping: ${error.message}`);
    logger.logError(`Failed to remove Postman mapping: ${error.message}`);
  }
}

/**
 * Handles the 'postman list' subcommand
 */
function handlePostmanList() {
  const mappings = settingsManager.getPostmanMappings();
  const entries = Object.entries(mappings);

  if (entries.length === 0) {
    console.log("No Postman mappings configured.");
    return;
  }

  console.log("\nPostman Mappings:");
  console.log("─".repeat(60));
  entries.forEach(([environmentId, config]) => {
    const name = config.environmentName || "(unknown)";
    console.log(`  ${name} (${environmentId}) → ${config.awsProfile}`);
  });
  console.log("─".repeat(60));
}

/**
 * Handles the 'postman sync' subcommand
 * @param {string} [specificEnvId] - Optional specific environment ID to sync
 */
async function handlePostmanSync(specificEnvId) {
  try {
    const apiKey = settingsManager.getPostmanApiKey();
    if (!apiKey) {
      console.log("Error: Postman API key not configured.");
      console.log("Usage: postman key <api-key>");
      return;
    }

    postmanApi.setApiKey(apiKey);

    const mappings = settingsManager.getPostmanMappings();
    let entries = Object.entries(mappings);

    if (entries.length === 0) {
      console.log("No Postman mappings configured. Use 'postman add' to create mappings first.");
      return;
    }

    // Filter to specific environment if provided
    if (specificEnvId) {
      entries = entries.filter(([environmentId]) => environmentId === specificEnvId);
      if (entries.length === 0) {
        console.log(`No Postman mapping found for environment: ${specificEnvId}`);
        return;
      }
    }

    // Check if AWS CLI is available
    if (!awsCredentials.isAwsCliAvailable()) {
      console.log("Error: AWS CLI is not available.");
      console.log("Please install AWS CLI to use this command.");
      logger.logError("AWS CLI not available for postman sync command");
      return;
    }

    console.log("\nSyncing to Postman environments...");
    console.log("─".repeat(60));

    let successCount = 0;
    let errorCount = 0;

    for (const [environmentId, config] of entries) {
      try {
        // Get AWS credentials
        const credentials = awsCredentials.getCredentialsAsEnvVars(config.awsProfile);

        // Map to Postman variable names (lowercase)
        const postmanCredentials = {
          aws_access_key_id: credentials.AWS_ACCESS_KEY_ID,
          aws_access_secret: credentials.AWS_SECRET_ACCESS_KEY,
          aws_session_token: credentials.AWS_SESSION_TOKEN
        };

        // Update Postman environment
        const result = await postmanApi.updateAwsCredentials(
          environmentId,
          postmanCredentials
        );

        // Update stored name if it changed
        if (result.environmentName && result.environmentName !== config.environmentName) {
          settingsManager.updatePostmanMappingName(environmentId, result.environmentName);
        }

        const displayName = result.environmentName || config.environmentName || environmentId;
        console.log(`✓ Updated ${displayName} (${config.awsProfile})`);
        successCount++;
      } catch (error) {
        const displayName = config.environmentName || environmentId;
        console.log(`✗ Failed to update ${displayName} (${config.awsProfile}): ${error.message}`);
        logger.logError(`Failed to sync ${environmentId} to Postman: ${error.message}`);
        errorCount++;
      }
    }

    console.log("─".repeat(60));
    console.log(`Sync complete: ${successCount} succeeded, ${errorCount} failed`);
    logger.logCommand(`postman sync - ${successCount} succeeded, ${errorCount} failed`);
  } catch (error) {
    console.log(`Error during sync: ${error.message}`);
    logger.logError(`Postman sync command failed: ${error.message}`);
  }
}

/**
 * Handles postman commands
 * @param {string[]} args - Command arguments
 */
async function handlePostman(args) {
  const subcommand = args[0];

  switch (subcommand) {
    case "key":
      handlePostmanKey(args[1]);
      break;

    case "envs":
      await handlePostmanEnvs();
      break;

    case "add":
      await handlePostmanAdd(args[1], args[2]);
      break;

    case "remove":
      handlePostmanRemove(args[1]);
      break;

    case "list":
      handlePostmanList();
      break;

    case "sync":
      await handlePostmanSync(args[1]);
      break;

    default:
      console.log("Unknown postman command. Available: key, envs, add, remove, list, sync");
      console.log('Type "help" for more information.');
  }
}

/**
 * Processes a command line input
 * @param {string} line - Input line
 * @param {readline.Interface} rl - Readline interface
 * @returns {Promise<void>}
 */
async function processCommand(line, rl) {
  const trimmed = line.trim();

  if (!trimmed) {
    return;
  }

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case "list":
      handleList();
      break;

    case "add":
      handleAdd(args[0], args[1]);
      break;

    case "remove":
      handleRemove(args[0]);
      break;

    case "profiles":
      handleProfiles();
      break;

    case "settings":
      handleSettings();
      break;

    case "log":
      handleLog(args);
      break;

    case "refresh":
      handleRefresh();
      break;

    case "postman":
      await handlePostman(args);
      break;

    case "exit":
    case "quit":
      console.log("Goodbye!");
      rl.close();
      return;

    case "help":
      printHelp();
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Type "help" for available commands.');
  }
}

/**
 * Prints help information
 */
function printHelp() {
  console.log(`
AWS Auto Env - Interactive REPL

Available Commands:
  list                         List all configured .env mappings
  add <env-path> <profile>     Add a new .env mapping
  remove <env-path>            Remove a .env mapping
  profiles                     List available AWS profiles
  settings                     Display current settings
  refresh                      Sync all .env files with AWS credentials
  log enable                   Enable logging
  log disable                  Disable logging
  log file <path>              Set log file path
  help                         Show this help message
  exit                         Exit the REPL

Postman Commands:
  postman key [api-key]        Set or show Postman API key
  postman envs                 List available Postman environments
  postman add <env-id> <profile>  Map Postman environment to AWS profile
  postman remove <env-id>      Remove Postman mapping for environment
  postman list                 List all Postman mappings
  postman sync [env-id]        Sync AWS credentials to Postman
`);
}

/**
 * Main function to start the REPL or run inline command
 */
async function main() {
  // Initialize settings file if it doesn't exist
  settingsManager.readSettings();

  // Check for command line arguments (skip first two: node and script path)
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Run inline command and exit
    const command = args.join(" ");
    const mockRl = {
      close: () => process.exit(0)
    };
    await processCommand(command, mockRl);
    process.exit(0);
  }

  // No arguments - start interactive REPL
  console.log("AWS Auto Env - Interactive REPL");
  console.log('Type "help" for available commands, "exit" to quit.\n');

  const rl = createInterface();

  rl.prompt();

  rl.on("line", async (line) => {
    await processCommand(line, rl);
    rl.prompt();
  });

  rl.on("close", () => {
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  let ctrlCCount = 0;
  rl.on("SIGINT", () => {
    ctrlCCount++;
    if (ctrlCCount === 1) {
      console.log("\n(Press Ctrl+C again to exit)");
      setTimeout(() => {
        ctrlCCount = 0;
      }, 2000);
    } else {
      console.log("\nGoodbye!");
      rl.close();
    }
  });
}

// Only run main if this is the main module
if (require.main === module) {
  main();
}

// Export functions for testing
module.exports = {
  handleList,
  handleAdd,
  handleRemove,
  handleProfiles,
  handleSettings,
  handleLog,
  handleRefresh,
  handlePostman,
  handlePostmanKey,
  handlePostmanEnvs,
  handlePostmanAdd,
  handlePostmanRemove,
  handlePostmanList,
  handlePostmanSync,
  processCommand,
  createInterface,
};
