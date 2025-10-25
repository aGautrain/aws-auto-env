# AWS Auto Env

An interactive REPL tool for managing AWS credentials in .env files by mapping environment file paths to AWS profiles.

## Features

- Display list of configured path/profile mappings
- Add new path/profile mappings
- Remove existing path/profile mappings
- List available AWS profiles from local configuration
- Display current settings configuration
- Configurable logging with file output
- Enable/disable logging and configure log file path via REPL commands
- Interactive command-line interface

## Getting Started

Launch the REPL:

```bash
aws-auto-env
```

This will start an interactive session where you can enter commands.

## Commands

### List Configured Mappings

```
list
```

Displays all configured (.env file path, AWS profile) pairs.

### Add New Mapping

```
add <env-file-path> <aws-profile>
```

Adds a new mapping between an .env file path and an AWS profile.

**Parameters:**

- `env-file-path`: Path to the .env file to be managed
- `aws-profile`: Name of the AWS profile to use for credentials

### Remove Mapping

```
remove <env-file-path>
```

Removes the mapping for the specified .env file path.

**Parameters:**

- `env-file-path`: Path of the .env file mapping to remove

### List Available AWS Profiles

```
profiles
```

Displays all AWS profiles available in the local AWS configuration.

### Display Settings

```
settings
```

Displays the current settings.json configuration, including all mappings and logging configuration.

### Enable Logging

```
log enable
```

Enables logging to the configured log file. Updates the `logging.enabled` setting to `true`.

### Disable Logging

```
log disable
```

Disables logging. Updates the `logging.enabled` setting to `false`.

### Set Log File Path

```
log file <path>
```

Sets the path for the log file.

**Parameters:**

- `path`: Path where logs should be written (e.g., `./logs/app.log`)

### Exit REPL

```
exit
```

or press `Ctrl+C` twice to exit the interactive session.

## Usage Example

```bash
# Start the REPL
$ aws-auto-env

> list
# Displays current mappings

> add ./backend/.env production
# Adds a new mapping

> remove ./backend/.env
# Removes a mapping

> profiles
# View available AWS profiles

> settings
# Display current settings configuration

> log enable
# Enable logging

> log file ./logs/debug.log
# Change log file path

> log disable
# Disable logging

> exit
# Exit the REPL
```

## Requirements

- Node.js
- AWS CLI configured with profiles
- Access to AWS credentials file (~/.aws/credentials)

## Configuration Storage

The tool maintains its own configuration in a `settings.json` file to store path/profile mappings, separate from AWS configuration files.

### Settings File Location

The `settings.json` file is stored in the project directory and contains:

- Path/profile mappings
- Logging configuration
- Other application settings

### Settings File Structure

```json
{
  "mappings": {
    "./backend/.env": "production",
    "./frontend/.env": "development"
  },
  "logging": {
    "enabled": true,
    "logFile": "./logs/aws-auto-env.log"
  }
}
```

#### Configuration Options

**mappings** (object)

- Key-value pairs mapping .env file paths to AWS profile names
- Example: `"./app/.env": "my-aws-profile"`

**logging.enabled** (boolean)

- Controls whether logging is enabled
- Default: `false`

**logging.logFile** (string)

- Path to the log file where application logs will be written
- Default: `"./aws-auto-env.log"`
