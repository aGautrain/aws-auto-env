#!/usr/bin/env node

const readline = require('readline');
const settingsManager = require('./lib/settings-manager');
const awsProfiles = require('./lib/aws-profiles');
const logger = require('./lib/logger');

/**
 * Creates and returns a readline interface
 * @returns {readline.Interface}
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });
}

/**
 * Handles the 'list' command
 */
function handleList() {
  const mappings = settingsManager.getMappings();
  const entries = Object.entries(mappings);

  if (entries.length === 0) {
    console.log('No mappings configured.');
    return;
  }

  console.log('\nConfigured Mappings:');
  console.log('─'.repeat(60));
  entries.forEach(([envPath, profile]) => {
    console.log(`${envPath} → ${profile}`);
  });
  console.log('─'.repeat(60));
}

/**
 * Handles the 'add' command
 * @param {string} envPath - Path to .env file
 * @param {string} awsProfile - AWS profile name
 */
function handleAdd(envPath, awsProfile) {
  if (!envPath || !awsProfile) {
    console.log('Error: Both <env-file-path> and <aws-profile> are required.');
    console.log('Usage: add <env-file-path> <aws-profile>');
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
    console.log('Error: <env-file-path> is required.');
    console.log('Usage: remove <env-file-path>');
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
      console.log('No AWS profiles found.');
      console.log('Make sure AWS CLI is configured with profiles.');
      return;
    }

    console.log('\nAvailable AWS Profiles:');
    console.log('─'.repeat(60));
    profiles.forEach(profile => {
      console.log(`  ${profile}`);
    });
    console.log('─'.repeat(60));
    logger.logCommand('profiles');
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
    console.log('\nCurrent Settings:');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(settings, null, 2));
    console.log('─'.repeat(60));
    logger.logCommand('settings');
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
      case 'enable':
        settingsManager.enableLogging();
        console.log('✓ Logging enabled');
        logger.logCommand('log enable');
        break;

      case 'disable':
        settingsManager.disableLogging();
        console.log('✓ Logging disabled');
        break;

      case 'file':
        const filePath = args[1];
        if (!filePath) {
          console.log('Error: <path> is required.');
          console.log('Usage: log file <path>');
          return;
        }
        settingsManager.setLogFile(filePath);
        console.log(`✓ Log file set to: ${filePath}`);
        logger.logCommand(`log file ${filePath}`);
        break;

      default:
        console.log('Unknown log command. Available: enable, disable, file <path>');
    }
  } catch (error) {
    console.log(`Error with log command: ${error.message}`);
    logger.logError(`Failed log command: ${error.message}`);
  }
}

/**
 * Processes a command line input
 * @param {string} line - Input line
 * @param {readline.Interface} rl - Readline interface
 */
function processCommand(line, rl) {
  const trimmed = line.trim();

  if (!trimmed) {
    return;
  }

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case 'list':
      handleList();
      break;

    case 'add':
      handleAdd(args[0], args[1]);
      break;

    case 'remove':
      handleRemove(args[0]);
      break;

    case 'profiles':
      handleProfiles();
      break;

    case 'settings':
      handleSettings();
      break;

    case 'log':
      handleLog(args);
      break;

    case 'exit':
    case 'quit':
      console.log('Goodbye!');
      rl.close();
      return;

    case 'help':
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
  list                         List all configured mappings
  add <env-path> <profile>     Add a new mapping
  remove <env-path>            Remove a mapping
  profiles                     List available AWS profiles
  settings                     Display current settings
  log enable                   Enable logging
  log disable                  Disable logging
  log file <path>              Set log file path
  help                         Show this help message
  exit                         Exit the REPL
`);
}

/**
 * Main function to start the REPL
 */
function main() {
  console.log('AWS Auto Env - Interactive REPL');
  console.log('Type "help" for available commands, "exit" to quit.\n');

  const rl = createInterface();

  rl.prompt();

  rl.on('line', (line) => {
    processCommand(line, rl);
    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  let ctrlCCount = 0;
  rl.on('SIGINT', () => {
    ctrlCCount++;
    if (ctrlCCount === 1) {
      console.log('\n(Press Ctrl+C again to exit)');
      setTimeout(() => {
        ctrlCCount = 0;
      }, 2000);
    } else {
      console.log('\nGoodbye!');
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
  processCommand,
  createInterface
};
