const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const awsCredentials = require("../lib/aws-credentials");

// Mock child_process
jest.mock("child_process");

describe("AWS Credentials", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCredentials", () => {
    test("should return credentials for valid profile", () => {
      const mockOutput = JSON.stringify({
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
      });

      execSync.mockReturnValue(mockOutput);

      const credentials = awsCredentials.getCredentials("production");

      expect(execSync).toHaveBeenCalledWith(
        "aws configure export-credentials --profile production --format env-no-export --output json",
        expect.any(Object)
      );
      expect(credentials.AWS_ACCESS_KEY_ID).toBe(
        "DUMMY_ACCESS_KEY_ID_1234567890"
      );
      expect(credentials.AWS_SECRET_ACCESS_KEY).toBe(
        "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ"
      );
    });

    test("should return credentials with session token", () => {
      const mockOutput = JSON.stringify({
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
        AWS_SESSION_TOKEN: "DUMMY_SESSION_TOKEN_1234567890",
      });

      execSync.mockReturnValue(mockOutput);

      const credentials = awsCredentials.getCredentials("staging");

      expect(credentials.AWS_SESSION_TOKEN).toBe(
        "DUMMY_SESSION_TOKEN_1234567890"
      );
    });

    test("should throw error when profile name is not provided", () => {
      expect(() => {
        awsCredentials.getCredentials();
      }).toThrow("Profile name is required");
    });

    test("should throw error when profile does not exist", () => {
      const error = new Error("Command failed");
      error.status = 1;
      execSync.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        awsCredentials.getCredentials("nonexistent");
      }).toThrow('Failed to get credentials for profile "nonexistent"');
    });

    test("should throw error when AWS CLI returns invalid JSON", () => {
      execSync.mockReturnValue("invalid json");

      expect(() => {
        awsCredentials.getCredentials("production");
      }).toThrow();
    });

    test("should throw error when credentials are missing required fields", () => {
      const mockOutput = JSON.stringify({
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        // Missing AWS_SECRET_ACCESS_KEY
      });

      execSync.mockReturnValue(mockOutput);

      expect(() => {
        awsCredentials.getCredentials("production");
      }).toThrow("Invalid credentials format returned from AWS CLI");
    });

    test("should handle output with extra whitespace", () => {
      const mockOutput = `
        ${JSON.stringify({
          AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
          AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
        })}
      `;

      execSync.mockReturnValue(mockOutput);

      const credentials = awsCredentials.getCredentials("production");

      expect(credentials.AWS_ACCESS_KEY_ID).toBe(
        "DUMMY_ACCESS_KEY_ID_1234567890"
      );
    });
  });

  describe("isAwsCliAvailable", () => {
    test("should return true when AWS CLI is available", () => {
      execSync.mockReturnValue("aws-cli/2.0.0");

      const available = awsCredentials.isAwsCliAvailable();

      expect(available).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        "aws --version",
        expect.any(Object)
      );
    });

    test("should return false when AWS CLI is not available", () => {
      execSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const available = awsCredentials.isAwsCliAvailable();

      expect(available).toBe(false);
    });
  });

  describe("getCredentialsAsEnvVars", () => {
    test("should return credentials formatted as environment variables", () => {
      const mockOutput = JSON.stringify({
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
      });

      execSync.mockReturnValue(mockOutput);

      const envVars = awsCredentials.getCredentialsAsEnvVars("production");

      expect(envVars).toEqual({
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
      });
    });

    test("should include session token when present", () => {
      const mockOutput = JSON.stringify({
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
        AWS_SESSION_TOKEN: "DUMMY_SESSION_TOKEN_1234567890",
      });

      execSync.mockReturnValue(mockOutput);

      const envVars = awsCredentials.getCredentialsAsEnvVars("staging");

      expect(envVars).toEqual({
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
        AWS_SESSION_TOKEN: "DUMMY_SESSION_TOKEN_1234567890",
      });
    });

    test("should not include session token when not present", () => {
      const mockOutput = JSON.stringify({
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
      });

      execSync.mockReturnValue(mockOutput);

      const envVars = awsCredentials.getCredentialsAsEnvVars("production");

      expect(envVars.AWS_SESSION_TOKEN).toBeUndefined();
    });
  });

  describe("writeCredentialsToFile", () => {
    const TEST_DIR = path.join(__dirname, "test-env-files");
    const TEST_FILE = path.join(TEST_DIR, ".env");

    beforeEach(() => {
      // Clean up test directory
      if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      // Clean up test directory
      if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      }
    });

    test("should create new file with credentials", () => {
      const credentials = {
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
      };

      awsCredentials.writeCredentialsToFile(credentials, TEST_FILE);

      expect(fs.existsSync(TEST_FILE)).toBe(true);
      const content = fs.readFileSync(TEST_FILE, "utf8");
      expect(content).toContain(
        "AWS_ACCESS_KEY_ID=DUMMY_ACCESS_KEY_ID_1234567890"
      );
      expect(content).toContain(
        "AWS_SECRET_ACCESS_KEY=DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ"
      );
    });

    test("should create directory if it does not exist", () => {
      const nestedFile = path.join(TEST_DIR, "nested", "dir", ".env");
      const credentials = {
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
      };

      awsCredentials.writeCredentialsToFile(credentials, nestedFile);

      expect(fs.existsSync(nestedFile)).toBe(true);
    });

    test("should update existing credentials", () => {
      // Create initial file
      const initialContent = `AWS_ACCESS_KEY_ID=OLD_KEY
AWS_SECRET_ACCESS_KEY=OLD_SECRET
OTHER_VAR=SHOULD_REMAIN`;

      fs.mkdirSync(TEST_DIR, { recursive: true });
      fs.writeFileSync(TEST_FILE, initialContent, "utf8");

      // Update credentials
      const newCredentials = {
        AWS_ACCESS_KEY_ID: "NEW_KEY",
        AWS_SECRET_ACCESS_KEY: "NEW_SECRET",
      };

      awsCredentials.writeCredentialsToFile(newCredentials, TEST_FILE);

      const content = fs.readFileSync(TEST_FILE, "utf8");
      expect(content).toContain("AWS_ACCESS_KEY_ID=NEW_KEY");
      expect(content).toContain("AWS_SECRET_ACCESS_KEY=NEW_SECRET");
      expect(content).toContain("OTHER_VAR=SHOULD_REMAIN");
      expect(content).not.toContain("OLD_KEY");
      expect(content).not.toContain("OLD_SECRET");
    });

    test("should append new credentials to existing file", () => {
      // Create initial file
      const initialContent = `EXISTING_VAR=VALUE`;

      fs.mkdirSync(TEST_DIR, { recursive: true });
      fs.writeFileSync(TEST_FILE, initialContent, "utf8");

      // Add new credentials
      const credentials = {
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
      };

      awsCredentials.writeCredentialsToFile(credentials, TEST_FILE);

      const content = fs.readFileSync(TEST_FILE, "utf8");
      expect(content).toContain("EXISTING_VAR=VALUE");
      expect(content).toContain(
        "AWS_ACCESS_KEY_ID=DUMMY_ACCESS_KEY_ID_1234567890"
      );
      expect(content).toContain(
        "AWS_SECRET_ACCESS_KEY=DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ"
      );
    });

    test("should preserve comments and empty lines", () => {
      // Create initial file with comments
      const initialContent = `# This is a comment
AWS_ACCESS_KEY_ID=OLD_KEY

# Another comment
OTHER_VAR=VALUE`;

      fs.mkdirSync(TEST_DIR, { recursive: true });
      fs.writeFileSync(TEST_FILE, initialContent, "utf8");

      // Update credentials
      const credentials = {
        AWS_ACCESS_KEY_ID: "NEW_KEY",
      };

      awsCredentials.writeCredentialsToFile(credentials, TEST_FILE);

      const content = fs.readFileSync(TEST_FILE, "utf8");
      expect(content).toContain("# This is a comment");
      expect(content).toContain("# Another comment");
      expect(content).toContain("AWS_ACCESS_KEY_ID=NEW_KEY");
      expect(content).toContain("OTHER_VAR=VALUE");
    });

    test("should handle session token", () => {
      const credentials = {
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
        AWS_SECRET_ACCESS_KEY: "DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ",
        AWS_SESSION_TOKEN: "DUMMY_SESSION_TOKEN_1234567890",
      };

      awsCredentials.writeCredentialsToFile(credentials, TEST_FILE);

      const content = fs.readFileSync(TEST_FILE, "utf8");
      expect(content).toContain(
        "AWS_SESSION_TOKEN=DUMMY_SESSION_TOKEN_1234567890"
      );
    });

    test("should throw error when file path is not provided", () => {
      const credentials = {
        AWS_ACCESS_KEY_ID: "DUMMY_ACCESS_KEY_ID_1234567890",
      };

      expect(() => {
        awsCredentials.writeCredentialsToFile(credentials, null);
      }).toThrow("File path is required");
    });

    test("should throw error when credentials is not an object", () => {
      expect(() => {
        awsCredentials.writeCredentialsToFile(null, TEST_FILE);
      }).toThrow("Credentials must be an object");

      expect(() => {
        awsCredentials.writeCredentialsToFile("invalid", TEST_FILE);
      }).toThrow("Credentials must be an object");
    });

    test("should handle mixed update and append operations", () => {
      // Create initial file
      const initialContent = `AWS_ACCESS_KEY_ID=OLD_KEY
EXISTING_VAR=VALUE`;

      fs.mkdirSync(TEST_DIR, { recursive: true });
      fs.writeFileSync(TEST_FILE, initialContent, "utf8");

      // Update one, keep one, add one
      const credentials = {
        AWS_ACCESS_KEY_ID: "NEW_KEY",
        AWS_SECRET_ACCESS_KEY: "NEW_SECRET",
      };

      awsCredentials.writeCredentialsToFile(credentials, TEST_FILE);

      const content = fs.readFileSync(TEST_FILE, "utf8");
      expect(content).toContain("AWS_ACCESS_KEY_ID=NEW_KEY");
      expect(content).toContain("EXISTING_VAR=VALUE");
      expect(content).toContain("AWS_SECRET_ACCESS_KEY=NEW_SECRET");
    });

    test("should handle empty credentials object", () => {
      // Create initial file
      const initialContent = `EXISTING_VAR=VALUE`;

      fs.mkdirSync(TEST_DIR, { recursive: true });
      fs.writeFileSync(TEST_FILE, initialContent, "utf8");

      // Write empty credentials (should not change file)
      awsCredentials.writeCredentialsToFile({}, TEST_FILE);

      const content = fs.readFileSync(TEST_FILE, "utf8");
      expect(content).toBe(initialContent);
    });
  });
});
