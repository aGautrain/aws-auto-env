# Postman Sync Setup Guide

A step-by-step guide to set up automatic AWS credential syncing to Postman environments.

## Prerequisites

### 1. Node.js

Ensure Node.js is installed:

```bash
node --version
```

If not installed, download from [nodejs.org](https://nodejs.org/en/download) or use a version manager like nvm.

### 2. AWS CLI

Ensure AWS CLI is installed:

```bash
aws --version
```

If not installed, follow the [AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

Configure AWS CLI with SSO (recommended):

```bash
aws configure sso
```

This interactive command will prompt you for:
- SSO session name
- SSO start URL (e.g., `https://my-company.awsapps.com/start`)
- SSO region
- Account and role selection

It creates two sections in `~/.aws/config`:

```ini
# SSO session configuration (reusable across profiles)
[sso-session my-session]
sso_start_url = https://my-company.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access

# Profile using the SSO session
[profile my-profile]
sso_session = my-session
sso_account_id = 123456789012
sso_role_name = MyRoleName
region = us-east-1
```

You can add multiple profiles using the same `sso-session` for different accounts/roles.

Verify your profiles are set up:

```bash
aws configure list-profiles
```

### 3. Clone/Install aws-auto-env

```bash
git clone <repository-url>
cd aws-auto-env
node aws-auto-env
```

### 4. Create an alias (optional but recommended)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias aws-auto-env="node /path/to/aws-auto-env/aws-auto-env.js"
```

Reload your shell:

```bash
source ~/.zshrc
```

## Postman API Key Setup

### 1. Generate a Postman API Key

1. Go to [Postman Web](https://identity.getpostman.com/)
2. Click your avatar (top right) → **Settings**
3. Select **API Keys** from the left sidebar
4. Click **Generate API Key**
5. Name it (e.g., "aws-auto-env")
6. Copy the key (starts with `PMAK-`)

### 2. Configure the API Key

You have two options:

**Option A: Store in settings (persistent)**

```bash
aws-auto-env
> postman key PMAK-your-api-key-here
```

**Option B: Use environment variable**

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export POSTMAN_API_KEY="PMAK-your-api-key-here"
```

The environment variable takes precedence over the stored setting.

## Map Postman Environments to AWS Profiles

### 1. List your Postman environments

```bash
aws-auto-env
> postman envs
```

This displays all your Postman environments with their IDs:

```
Available Postman environments:
─────────────────────────────────────────────────────────────
  ID                                    Name
─────────────────────────────────────────────────────────────
  abc123-def456-789...                  Production
  xyz789-abc123-456...                  Staging
  ...
```

### 2. Postman environment variables

The sync will create/update the following variables in your Postman environment:

| Variable Name | Description |
|---------------|-------------|
| `aws_access_key_id` | AWS access key ID |
| `aws_access_secret` | AWS secret access key |
| `aws_session_token` | AWS session token (for temporary credentials) |

You can reference these variables in your Postman requests using `{{aws_access_key_id}}`, `{{aws_access_secret}}`, and `{{aws_session_token}}`.

### 3. List your AWS profiles

```bash
> profiles
```

### 4. Map environments to profiles

```bash
> postman add <environment-id> <aws-profile>
```

Example:

```bash
> postman add abc123-def456-789 production
> postman add xyz789-abc123-456 staging
```

### 5. Verify your mappings

```bash
> postman list
```

## Sync Credentials

### Manual sync (from anywhere)

Once your alias is set up, you can sync credentials with a single command from any directory:

```bash
aws-auto-env postman sync
```

Or from the interactive mode:

```bash
aws-auto-env
> postman sync
```

Output:

```
Syncing to Postman environments...
────────────────────────────────────────────────────────────
✓ Updated Production (production)
○ Unchanged Staging (staging)
────────────────────────────────────────────────────────────
Sync complete: 1 updated, 1 unchanged, 0 failed
```

### Sync a specific environment

```bash
> postman sync <environment-id>
```

## Automated Sync with Cron

### 1. Set up the cron job

Open crontab editor:

```bash
crontab -e
```

Add one of these schedules (adjust the path to your installation):

```bash
# Every hour
0 * * * * node /path/to/aws-auto-env/aws-auto-env.js postman sync

# Every 30 minutes
*/30 * * * * node /path/to/aws-auto-env/aws-auto-env.js postman sync

# Every day at 9 AM
0 9 * * * node /path/to/aws-auto-env/aws-auto-env.js postman sync

# Every weekday at 9 AM
0 9 * * 1-5 node /path/to/aws-auto-env/aws-auto-env.js postman sync
```

**Note:** Enable logging with `log enable` to track sync results in `~/.config/aws-auto-env/aws-auto-env.log`.

Save and exit (`:wq` in vim).

### 2. Verify cron is set up

```bash
crontab -l
```

### Important Notes for Cron

1. **AWS SSO Sessions**: Cron jobs run without user interaction. If your AWS SSO session expires, the sync will fail. Consider:
   - Using long-lived credentials for automation
   - Running `aws sso login --profile <profile>` manually before the session expires
   - Setting up a separate IAM user with programmatic access for automation

2. **Environment Variables**: Cron runs with a minimal environment. If using `POSTMAN_API_KEY` as an env var, add it inline:

   ```bash
   0 * * * * POSTMAN_API_KEY="PMAK-your-key" node /path/to/aws-auto-env/aws-auto-env.js postman sync
   ```

3. **Node.js Path**: If cron can't find node, use the full path:

   ```bash
   0 * * * * /usr/local/bin/node /path/to/aws-auto-env/aws-auto-env.js postman sync
   ```

   Find your node path with: `which node`

## Troubleshooting

### "Postman API key not set"

Run `postman key <your-key>` or set the `POSTMAN_API_KEY` environment variable.

### "Environment not found"

Verify the environment ID with `postman envs`. IDs are case-sensitive.

### "AWS CLI is not available"

Ensure AWS CLI is installed and in your PATH.

### "Could not get credentials for profile"

1. Check the profile exists: `aws configure list-profiles`
2. Try logging in: `aws sso login --profile <profile-name>`

### Cron job not running

1. Check cron logs: `grep CRON /var/log/syslog` (Linux) or `log show --predicate 'process == "cron"' --last 1h` (macOS)
2. Test the command manually: `node /path/to/aws-auto-env/aws-auto-env.js postman sync`
3. Ensure full paths are used for node and the script
4. Enable logging (`log enable`) and check the log file: `cat ~/.config/aws-auto-env/aws-auto-env.log`

## Quick Reference

| Command | Description |
|---------|-------------|
| `postman key <api-key>` | Set Postman API key |
| `postman envs` | List Postman environments |
| `postman add <env-id> <profile>` | Map environment to AWS profile |
| `postman remove <env-id>` | Remove a mapping |
| `postman list` | Show all mappings |
| `postman sync` | Sync all mapped environments |
| `postman sync <env-id>` | Sync specific environment |
