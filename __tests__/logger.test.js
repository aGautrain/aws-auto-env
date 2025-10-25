const fs = require('fs');
const path = require('path');

// Mock the settings manager before requiring logger
jest.mock('../lib/settings-manager');
const settingsManager = require('../lib/settings-manager');
const logger = require('../lib/logger');

describe('Logger', () => {
  const TEST_LOG_FILE = path.join(__dirname, 'test-logs', 'test.log');
  const TEST_LOG_DIR = path.join(__dirname, 'test-logs');

  beforeEach(() => {
    // Clean up test log files
    if (fs.existsSync(TEST_LOG_FILE)) {
      fs.unlinkSync(TEST_LOG_FILE);
    }
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmdirSync(TEST_LOG_DIR);
    }

    // Clear all mocks
    jest.clearAllMocks();

    // Mock settings to use test log file
    settingsManager.getLoggingConfig.mockReturnValue({
      enabled: false,
      logFile: TEST_LOG_FILE
    });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(TEST_LOG_FILE)) {
      fs.unlinkSync(TEST_LOG_FILE);
    }
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmdirSync(TEST_LOG_DIR);
    }
  });

  describe('log', () => {
    test('should not write to file when logging is disabled', () => {
      settingsManager.getLoggingConfig.mockReturnValue({
        enabled: false,
        logFile: TEST_LOG_FILE
      });

      logger.log('Test message');

      expect(fs.existsSync(TEST_LOG_FILE)).toBe(false);
    });

    test('should write to file when logging is enabled', () => {
      settingsManager.getLoggingConfig.mockReturnValue({
        enabled: true,
        logFile: TEST_LOG_FILE
      });

      logger.log('Test message');

      expect(fs.existsSync(TEST_LOG_FILE)).toBe(true);
      const content = fs.readFileSync(TEST_LOG_FILE, 'utf8');
      expect(content).toContain('Test message');
    });

    test('should include timestamp in log message', () => {
      settingsManager.getLoggingConfig.mockReturnValue({
        enabled: true,
        logFile: TEST_LOG_FILE
      });

      logger.log('Test message');

      const content = fs.readFileSync(TEST_LOG_FILE, 'utf8');
      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should append multiple messages', () => {
      settingsManager.getLoggingConfig.mockReturnValue({
        enabled: true,
        logFile: TEST_LOG_FILE
      });

      logger.log('First message');
      logger.log('Second message');

      const content = fs.readFileSync(TEST_LOG_FILE, 'utf8');
      expect(content).toContain('First message');
      expect(content).toContain('Second message');
    });

    test('should create log directory if it does not exist', () => {
      settingsManager.getLoggingConfig.mockReturnValue({
        enabled: true,
        logFile: TEST_LOG_FILE
      });

      expect(fs.existsSync(TEST_LOG_DIR)).toBe(false);

      logger.log('Test message');

      expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
      expect(fs.existsSync(TEST_LOG_FILE)).toBe(true);
    });
  });

  describe('logCommand', () => {
    test('should log command with prefix', () => {
      settingsManager.getLoggingConfig.mockReturnValue({
        enabled: true,
        logFile: TEST_LOG_FILE
      });

      logger.logCommand('test command');

      const content = fs.readFileSync(TEST_LOG_FILE, 'utf8');
      expect(content).toContain('Command executed: test command');
    });
  });

  describe('logError', () => {
    test('should log error with prefix', () => {
      settingsManager.getLoggingConfig.mockReturnValue({
        enabled: true,
        logFile: TEST_LOG_FILE
      });

      logger.logError('test error');

      const content = fs.readFileSync(TEST_LOG_FILE, 'utf8');
      expect(content).toContain('ERROR: test error');
    });
  });
});
