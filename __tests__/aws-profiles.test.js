const fs = require('fs');
const path = require('path');
const os = require('os');
const awsProfiles = require('../lib/aws-profiles');

describe('AWS Profiles', () => {
  describe('parseProfilesFromFile', () => {
    const TEST_FILE = path.join(__dirname, 'test-aws-config');

    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    test('should return empty array for non-existent file', () => {
      const profiles = awsProfiles.parseProfilesFromFile('/nonexistent/path');
      expect(profiles).toEqual([]);
    });

    test('should parse profiles from credentials file format', () => {
      const content = `[default]
aws_access_key_id = DUMMY_ACCESS_KEY_ID_1234567890
aws_secret_access_key = DUMMY_SECRET_ACCESS_KEY_1234567890ABCDEFGHIJ

[production]
aws_access_key_id = DUMMY_ACCESS_KEY_ID_0987654321
aws_secret_access_key = DUMMY_SECRET_ACCESS_KEY_0987654321ZYXWVUTSRQ`;

      fs.writeFileSync(TEST_FILE, content);

      const profiles = awsProfiles.parseProfilesFromFile(TEST_FILE);
      expect(profiles).toEqual(['default', 'production']);
    });

    test('should parse profiles from config file format with "profile" prefix', () => {
      const content = `[default]
region = us-east-1

[profile dev]
region = us-west-2

[profile staging]
region = eu-west-1`;

      fs.writeFileSync(TEST_FILE, content);

      const profiles = awsProfiles.parseProfilesFromFile(TEST_FILE);
      expect(profiles).toEqual(['default', 'dev', 'staging']);
    });

    test('should handle mixed format files', () => {
      const content = `[default]
region = us-east-1

[profile production]
region = us-west-2

[testing]
region = ap-southeast-1`;

      fs.writeFileSync(TEST_FILE, content);

      const profiles = awsProfiles.parseProfilesFromFile(TEST_FILE);
      expect(profiles).toEqual(['default', 'production', 'testing']);
    });

    test('should ignore empty lines and comments', () => {
      const content = `# This is a comment
[default]
region = us-east-1

# Another comment
[profile production]
region = us-west-2

`;

      fs.writeFileSync(TEST_FILE, content);

      const profiles = awsProfiles.parseProfilesFromFile(TEST_FILE);
      expect(profiles).toEqual(['default', 'production']);
    });
  });

  describe('getCredentialsPath', () => {
    test('should return path to credentials file', () => {
      const credPath = awsProfiles.getCredentialsPath();
      expect(credPath).toContain('.aws');
      expect(credPath).toContain('credentials');
      expect(credPath).toContain(os.homedir());
    });
  });

  describe('getConfigPath', () => {
    test('should return path to config file', () => {
      const configPath = awsProfiles.getConfigPath();
      expect(configPath).toContain('.aws');
      expect(configPath).toContain('config');
      expect(configPath).toContain(os.homedir());
    });
  });

  describe('getAvailableProfiles', () => {
    let parseProfilesSpy;

    beforeEach(() => {
      // Clean up any existing spies
      if (parseProfilesSpy) {
        parseProfilesSpy.mockRestore();
      }
    });

    afterEach(() => {
      if (parseProfilesSpy) {
        parseProfilesSpy.mockRestore();
      }
    });

    test('should return empty array when no AWS files exist', () => {
      // Mock the parseProfilesFromFile to return empty arrays for both calls
      parseProfilesSpy = jest.spyOn(awsProfiles, 'parseProfilesFromFile')
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const profiles = awsProfiles.getAvailableProfiles();
      expect(profiles).toEqual([]);
    });

    test('should combine and deduplicate profiles from both files', () => {
      parseProfilesSpy = jest.spyOn(awsProfiles, 'parseProfilesFromFile')
        .mockReturnValueOnce(['default', 'production', 'dev'])
        .mockReturnValueOnce(['default', 'staging', 'dev']);

      const profiles = awsProfiles.getAvailableProfiles();
      expect(profiles).toEqual(['default', 'dev', 'production', 'staging']);
    });

    test('should return sorted profiles', () => {
      parseProfilesSpy = jest.spyOn(awsProfiles, 'parseProfilesFromFile')
        .mockReturnValueOnce(['zebra', 'alpha', 'beta'])
        .mockReturnValueOnce([]);

      const profiles = awsProfiles.getAvailableProfiles();
      expect(profiles).toEqual(['alpha', 'beta', 'zebra']);
    });
  });
});
