# AWS Auto Env

An interactive CLI tool for syncing AWS credentials to `.env` files and Postman environments.

## Features

- Sync AWS credentials to `.env` files
- Sync AWS credentials to Postman environments
- Automatic AWS SSO login when credentials expire
- Map multiple environments to different AWS profiles

## Quick Start

### Prerequisites

- Node.js
- AWS CLI with configured profiles

### Installation

```bash
git clone <repository-url>
cd aws-auto-env
```

Add an alias to your `~/.zshrc` or `~/.bashrc`:

```bash
alias aws-auto-env="node /path/to/aws-auto-env/aws-auto-env.js"
alias aws-to-postman="node /path/to/aws-auto-env/aws-auto-env.js postman sync"
```

### Usage

```bash
# Start interactive mode
aws-auto-env

# Or run commands directly
aws-auto-env sync
aws-auto-env postman sync
```

## Commands

| Command | Description |
|---------|-------------|
| `list` | Show .env file mappings |
| `add <path> <profile>` | Map .env file to AWS profile |
| `remove <path>` | Remove .env mapping |
| `profiles` | List available AWS profiles |
| `sync` | Sync all .env files with credentials |
| `settings` | Display current configuration |

### Postman Integration

| Command | Description |
|---------|-------------|
| `postman key <api-key>` | Set Postman API key |
| `postman envs` | List Postman environments |
| `postman add <env-id> <profile>` | Map Postman environment to AWS profile |
| `postman remove <env-id>` | Remove Postman mapping |
| `postman list` | Show Postman mappings |
| `postman sync [env-id]` | Sync credentials to Postman |

For detailed Postman setup instructions, see [SETUP.md](SETUP.md).

### Logging

| Command | Description |
|---------|-------------|
| `log enable` | Enable file logging |
| `log disable` | Disable file logging |
| `log file <path>` | Set log file path |

## Example Session

```bash
$ aws-auto-env

> profiles
# View available AWS profiles

> add ./backend/.env production
# Map .env file to AWS profile

> sync
# Sync credentials (auto-login if SSO expired)

> postman sync
# Sync to Postman environments

> exit
```

## Configuration

Settings are stored in `~/.config/aws-auto-env/settings.json`:

```json
{
  "mappings": {
    "./backend/.env": "production"
  },
  "postmanMappings": {
    "abc123-def456": {
      "awsProfile": "production",
      "environmentName": "Production"
    }
  },
  "logging": {
    "enabled": false,
    "logFile": "./aws-auto-env.log"
  }
}
```
