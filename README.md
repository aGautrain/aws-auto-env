# AWS Auto Env

An interactive REPL tool for managing AWS credentials in .env files and Postman environments by mapping them to AWS profiles.

## Features

- Display list of configured path/profile mappings
- Add new path/profile mappings
- Remove existing path/profile mappings
- List available AWS profiles from local configuration
- Display current settings configuration
- Sync all .env files with AWS credentials from profiles
- Sync AWS credentials to Postman environments via API
- Automatic AWS SSO login when credentials expire
- Configurable logging with file output
- Enable/disable logging and configure log file path via REPL commands
- Interactive command-line interface

## Getting Started

### Prerequisites

**Required:**
- **AWS CLI** with configured profiles - [AWS CLI Configuration Guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
  - Set up at least one AWS profile in `~/.aws/credentials` or `~/.aws/config`
  - For SSO users: [Configure AWS SSO](https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html)

**Optional (for Postman integration):**
- **Postman API Key** - [Generate a Postman API Key](https://learning.postman.com/docs/developer/postman-api/authentication/#generate-a-postman-api-key)

### Launch the REPL

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

### Refresh Credentials

```
refresh
```

Syncs all mapped .env files with their associated AWS profile credentials. This command:

- Checks if AWS CLI is available
- Groups .env files by their AWS profile
- Fetches credentials for each profile using AWS CLI
- Updates or appends credentials in each .env file
- Automatically triggers AWS SSO login if credentials are expired

**Auto-Login:** If AWS SSO credentials have expired, the tool will automatically run `aws sso login` for the profile and retry fetching credentials. This provides a seamless experience without manual intervention.

**Note:** Requires AWS CLI to be installed and configured.

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

### Postman Integration

The tool can sync AWS credentials directly to Postman environments, allowing you to keep your Postman collections up-to-date with fresh AWS credentials.

#### Set Postman API Key

```
postman key <api-key>
```

Sets or displays the Postman API key used for authentication.

**Parameters:**

- `api-key`: Your Postman API key (optional - omit to display current key)

**Note:** You can also set the API key via the `POSTMAN_API_KEY` environment variable.

#### List Postman Environments

```
postman envs
```

Lists all available Postman environments in your workspace.

#### Add Postman Mapping

```
postman add <environment-id> <aws-profile>
```

Maps a Postman environment to an AWS profile for credential syncing.

**Parameters:**

- `environment-id`: Postman environment ID (from `postman envs` command)
- `aws-profile`: Name of the AWS profile to use for credentials

#### Remove Postman Mapping

```
postman remove <environment-id>
```

Removes the mapping for a Postman environment.

**Parameters:**

- `environment-id`: Postman environment ID to remove

#### List Postman Mappings

```
postman list
```

Displays all configured Postman environment to AWS profile mappings.

#### Sync to Postman

```
postman sync [environment-id]
```

Syncs AWS credentials to Postman environments. Updates the following variables in each mapped environment:
- `aws_access_key_id`
- `aws_access_secret`
- `aws_session_token`

**Parameters:**

- `environment-id`: Optional - sync only a specific environment. Omit to sync all mapped environments.

**Auto-Login:** Like the `refresh` command, if AWS SSO credentials have expired, the tool will automatically trigger AWS SSO login and retry.

**Note:** Preserves all existing non-AWS variables in the Postman environment.

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
# Displays current .env file mappings

> add ./backend/.env production
# Adds a new .env file mapping

> profiles
# View available AWS profiles

> refresh
# Sync all .env files with AWS credentials (auto-login if expired)

> postman key PMAK-xxxxx
# Set Postman API key

> postman envs
# List Postman environments

> postman add abc123def456 production
# Map Postman environment to AWS profile

> postman list
# Display Postman mappings

> postman sync
# Sync AWS credentials to all mapped Postman environments

> settings
# Display current settings configuration

> log enable
# Enable logging

> exit
# Exit the REPL
```

## Requirements

- Node.js
- AWS CLI configured with profiles (see [Getting Started](#getting-started) for setup instructions)
- (Optional) Postman API key for Postman integration

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
  "postmanMappings": {
    "abc123def456": {
      "awsProfile": "production",
      "environmentName": "Production Environment"
    }
  },
  "postman": {
    "apiKey": "PMAK-xxxxx"
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

**postmanMappings** (object)

- Key-value pairs mapping Postman environment IDs to AWS profiles
- Each value contains `awsProfile` and optional `environmentName`
- Example: `"abc123": { "awsProfile": "production", "environmentName": "Prod" }`

**postman.apiKey** (string)

- Postman API key for authentication
- Can also be set via `POSTMAN_API_KEY` environment variable
- Default: `null`

**logging.enabled** (boolean)

- Controls whether logging is enabled
- Default: `false`

**logging.logFile** (string)

- Path to the log file where application logs will be written
- Default: `"./aws-auto-env.log"`
