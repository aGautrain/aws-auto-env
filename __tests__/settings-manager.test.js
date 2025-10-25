const fs = require('fs');
const path = require('path');
const settingsManager = require('../lib/settings-manager');

// Mock settings file path for tests
const TEST_SETTINGS_FILE = path.join(__dirname, 'test-settings.json');

describe('Settings Manager', () => {
  // Override SETTINGS_FILE for testing
  beforeAll(() => {
    // Change the settings file path for tests
    settingsManager.setSettingsFile(TEST_SETTINGS_FILE);
  });

  beforeEach(() => {
    // Clean up test settings file before each test
    if (fs.existsSync(TEST_SETTINGS_FILE)) {
      fs.unlinkSync(TEST_SETTINGS_FILE);
    }
  });

  afterEach(() => {
    // Clean up test settings file after each test
    if (fs.existsSync(TEST_SETTINGS_FILE)) {
      fs.unlinkSync(TEST_SETTINGS_FILE);
    }
  });

  describe('readSettings', () => {
    test('should create default settings if file does not exist', () => {
      const settings = settingsManager.readSettings();

      expect(settings).toHaveProperty('mappings');
      expect(settings).toHaveProperty('logging');
      expect(settings.mappings).toEqual({});
      expect(settings.logging.enabled).toBe(false);
    });

    test('should read existing settings file', () => {
      const testSettings = {
        mappings: { './test.env': 'test-profile' },
        logging: { enabled: true, logFile: './test.log' }
      };

      fs.writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(testSettings));

      const settings = settingsManager.readSettings();
      expect(settings.mappings).toEqual({ './test.env': 'test-profile' });
      expect(settings.logging.enabled).toBe(true);
    });
  });

  describe('writeSettings', () => {
    test('should write settings to file', () => {
      const settings = {
        mappings: { './app.env': 'production' },
        logging: { enabled: false, logFile: './app.log' }
      };

      settingsManager.writeSettings(settings);

      expect(fs.existsSync(TEST_SETTINGS_FILE)).toBe(true);
      const written = JSON.parse(fs.readFileSync(TEST_SETTINGS_FILE, 'utf8'));
      expect(written.mappings).toEqual({ './app.env': 'production' });
    });
  });

  describe('getMappings', () => {
    test('should return empty object when no mappings exist', () => {
      const mappings = settingsManager.getMappings();
      expect(mappings).toEqual({});
    });

    test('should return existing mappings', () => {
      const testSettings = {
        mappings: { './test.env': 'test-profile', './app.env': 'prod' },
        logging: { enabled: false, logFile: './test.log' }
      };

      fs.writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(testSettings));

      const mappings = settingsManager.getMappings();
      expect(mappings).toEqual({ './test.env': 'test-profile', './app.env': 'prod' });
    });
  });

  describe('addMapping', () => {
    test('should add a new mapping', () => {
      settingsManager.addMapping('./new.env', 'new-profile');

      const mappings = settingsManager.getMappings();
      expect(mappings['./new.env']).toBe('new-profile');
    });

    test('should overwrite existing mapping', () => {
      settingsManager.addMapping('./test.env', 'old-profile');
      settingsManager.addMapping('./test.env', 'new-profile');

      const mappings = settingsManager.getMappings();
      expect(mappings['./test.env']).toBe('new-profile');
    });
  });

  describe('removeMapping', () => {
    test('should remove existing mapping', () => {
      settingsManager.addMapping('./test.env', 'test-profile');

      const removed = settingsManager.removeMapping('./test.env');
      expect(removed).toBe(true);

      const mappings = settingsManager.getMappings();
      expect(mappings['./test.env']).toBeUndefined();
    });

    test('should return false when mapping does not exist', () => {
      const removed = settingsManager.removeMapping('./nonexistent.env');
      expect(removed).toBe(false);
    });
  });

  describe('getLoggingConfig', () => {
    test('should return default logging config', () => {
      const config = settingsManager.getLoggingConfig();

      expect(config.enabled).toBe(false);
      expect(config.logFile).toBeDefined();
    });

    test('should return custom logging config', () => {
      const testSettings = {
        mappings: {},
        logging: { enabled: true, logFile: './custom.log' }
      };

      fs.writeFileSync(TEST_SETTINGS_FILE, JSON.stringify(testSettings));

      const config = settingsManager.getLoggingConfig();
      expect(config.enabled).toBe(true);
      expect(config.logFile).toBe('./custom.log');
    });
  });

  describe('enableLogging', () => {
    test('should enable logging', () => {
      settingsManager.enableLogging();

      const config = settingsManager.getLoggingConfig();
      expect(config.enabled).toBe(true);
    });
  });

  describe('disableLogging', () => {
    test('should disable logging', () => {
      settingsManager.enableLogging();
      settingsManager.disableLogging();

      const config = settingsManager.getLoggingConfig();
      expect(config.enabled).toBe(false);
    });
  });

  describe('setLogFile', () => {
    test('should set log file path', () => {
      settingsManager.setLogFile('./new-log.log');

      const config = settingsManager.getLoggingConfig();
      expect(config.logFile).toBe('./new-log.log');
    });
  });
});
