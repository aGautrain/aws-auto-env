const app = require('../aws-auto-env');
const settingsManager = require('../lib/settings-manager');
const awsProfiles = require('../lib/aws-profiles');

// Mock console.log to capture output
let consoleOutput = [];
const originalLog = console.log;

beforeEach(() => {
  consoleOutput = [];
  console.log = (...args) => {
    consoleOutput.push(args.join(' '));
  };
});

afterEach(() => {
  console.log = originalLog;
  jest.restoreAllMocks();
});

describe('AWS Auto Env REPL', () => {
  describe('handleList', () => {
    test('should display message when no mappings exist', () => {
      jest.spyOn(settingsManager, 'getMappings').mockReturnValue({});

      app.handleList();

      expect(consoleOutput.join('\n')).toContain('No mappings configured');
    });

    test('should display all mappings', () => {
      jest.spyOn(settingsManager, 'getMappings').mockReturnValue({
        './app.env': 'production',
        './test.env': 'development'
      });

      app.handleList();

      const output = consoleOutput.join('\n');
      expect(output).toContain('./app.env → production');
      expect(output).toContain('./test.env → development');
    });
  });

  describe('handleAdd', () => {
    test('should add a new mapping', () => {
      const addMappingSpy = jest.spyOn(settingsManager, 'addMapping').mockImplementation(() => {});

      app.handleAdd('./new.env', 'new-profile');

      expect(addMappingSpy).toHaveBeenCalledWith('./new.env', 'new-profile');
      expect(consoleOutput.join('\n')).toContain('Added mapping');
    });

    test('should show error when env path is missing', () => {
      app.handleAdd(undefined, 'profile');

      expect(consoleOutput.join('\n')).toContain('Error');
      expect(consoleOutput.join('\n')).toContain('required');
    });

    test('should show error when aws profile is missing', () => {
      app.handleAdd('./test.env', undefined);

      expect(consoleOutput.join('\n')).toContain('Error');
      expect(consoleOutput.join('\n')).toContain('required');
    });

    test('should handle errors during add', () => {
      jest.spyOn(settingsManager, 'addMapping').mockImplementation(() => {
        throw new Error('Write failed');
      });

      app.handleAdd('./test.env', 'profile');

      expect(consoleOutput.join('\n')).toContain('Error adding mapping');
    });
  });

  describe('handleRemove', () => {
    test('should remove existing mapping', () => {
      jest.spyOn(settingsManager, 'removeMapping').mockReturnValue(true);

      app.handleRemove('./test.env');

      expect(consoleOutput.join('\n')).toContain('Removed mapping');
    });

    test('should show message when mapping does not exist', () => {
      jest.spyOn(settingsManager, 'removeMapping').mockReturnValue(false);

      app.handleRemove('./nonexistent.env');

      expect(consoleOutput.join('\n')).toContain('No mapping found');
    });

    test('should show error when env path is missing', () => {
      app.handleRemove(undefined);

      expect(consoleOutput.join('\n')).toContain('Error');
      expect(consoleOutput.join('\n')).toContain('required');
    });

    test('should handle errors during remove', () => {
      jest.spyOn(settingsManager, 'removeMapping').mockImplementation(() => {
        throw new Error('Write failed');
      });

      app.handleRemove('./test.env');

      expect(consoleOutput.join('\n')).toContain('Error removing mapping');
    });
  });

  describe('handleProfiles', () => {
    test('should display available profiles', () => {
      jest.spyOn(awsProfiles, 'getAvailableProfiles').mockReturnValue([
        'default',
        'production',
        'development'
      ]);

      app.handleProfiles();

      const output = consoleOutput.join('\n');
      expect(output).toContain('default');
      expect(output).toContain('production');
      expect(output).toContain('development');
    });

    test('should show message when no profiles found', () => {
      jest.spyOn(awsProfiles, 'getAvailableProfiles').mockReturnValue([]);

      app.handleProfiles();

      expect(consoleOutput.join('\n')).toContain('No AWS profiles found');
    });

    test('should handle errors when reading profiles', () => {
      jest.spyOn(awsProfiles, 'getAvailableProfiles').mockImplementation(() => {
        throw new Error('Read failed');
      });

      app.handleProfiles();

      expect(consoleOutput.join('\n')).toContain('Error reading AWS profiles');
    });
  });

  describe('handleSettings', () => {
    test('should display current settings', () => {
      jest.spyOn(settingsManager, 'readSettings').mockReturnValue({
        mappings: { './app.env': 'prod' },
        logging: { enabled: true, logFile: './app.log' }
      });

      app.handleSettings();

      const output = consoleOutput.join('\n');
      expect(output).toContain('"mappings"');
      expect(output).toContain('"logging"');
      expect(output).toContain('./app.env');
    });

    test('should handle errors when reading settings', () => {
      jest.spyOn(settingsManager, 'readSettings').mockImplementation(() => {
        throw new Error('Read failed');
      });

      app.handleSettings();

      expect(consoleOutput.join('\n')).toContain('Error reading settings');
    });
  });

  describe('handleLog', () => {
    test('should enable logging', () => {
      const enableSpy = jest.spyOn(settingsManager, 'enableLogging').mockImplementation(() => {});

      app.handleLog(['enable']);

      expect(enableSpy).toHaveBeenCalled();
      expect(consoleOutput.join('\n')).toContain('Logging enabled');
    });

    test('should disable logging', () => {
      const disableSpy = jest.spyOn(settingsManager, 'disableLogging').mockImplementation(() => {});

      app.handleLog(['disable']);

      expect(disableSpy).toHaveBeenCalled();
      expect(consoleOutput.join('\n')).toContain('Logging disabled');
    });

    test('should set log file path', () => {
      const setLogFileSpy = jest.spyOn(settingsManager, 'setLogFile').mockImplementation(() => {});

      app.handleLog(['file', './new-log.log']);

      expect(setLogFileSpy).toHaveBeenCalledWith('./new-log.log');
      expect(consoleOutput.join('\n')).toContain('Log file set to');
    });

    test('should show error when log file path is missing', () => {
      app.handleLog(['file']);

      expect(consoleOutput.join('\n')).toContain('Error');
      expect(consoleOutput.join('\n')).toContain('required');
    });

    test('should show error for unknown log command', () => {
      app.handleLog(['invalid']);

      expect(consoleOutput.join('\n')).toContain('Unknown log command');
    });

    test('should handle errors during log commands', () => {
      jest.spyOn(settingsManager, 'enableLogging').mockImplementation(() => {
        throw new Error('Write failed');
      });

      app.handleLog(['enable']);

      expect(consoleOutput.join('\n')).toContain('Error with log command');
    });
  });

  describe('processCommand', () => {
    test('should handle list command', () => {
      jest.spyOn(settingsManager, 'getMappings').mockReturnValue({});

      const mockRl = { close: jest.fn() };
      app.processCommand('list', mockRl);

      expect(consoleOutput.join('\n')).toContain('No mappings');
    });

    test('should handle add command', () => {
      jest.spyOn(settingsManager, 'addMapping').mockImplementation(() => {});

      const mockRl = { close: jest.fn() };
      app.processCommand('add ./test.env prod', mockRl);

      expect(consoleOutput.join('\n')).toContain('Added mapping');
    });

    test('should handle remove command', () => {
      jest.spyOn(settingsManager, 'removeMapping').mockReturnValue(true);

      const mockRl = { close: jest.fn() };
      app.processCommand('remove ./test.env', mockRl);

      expect(consoleOutput.join('\n')).toContain('Removed mapping');
    });

    test('should handle profiles command', () => {
      jest.spyOn(awsProfiles, 'getAvailableProfiles').mockReturnValue([]);

      const mockRl = { close: jest.fn() };
      app.processCommand('profiles', mockRl);

      expect(consoleOutput.join('\n')).toContain('No AWS profiles found');
    });

    test('should handle settings command', () => {
      jest.spyOn(settingsManager, 'readSettings').mockReturnValue({
        mappings: {},
        logging: { enabled: false, logFile: './app.log' }
      });

      const mockRl = { close: jest.fn() };
      app.processCommand('settings', mockRl);

      expect(consoleOutput.join('\n')).toContain('Current Settings');
    });

    test('should handle log commands', () => {
      jest.spyOn(settingsManager, 'enableLogging').mockImplementation(() => {});

      const mockRl = { close: jest.fn() };
      app.processCommand('log enable', mockRl);

      expect(consoleOutput.join('\n')).toContain('Logging enabled');
    });

    test('should handle exit command', () => {
      const mockRl = { close: jest.fn() };
      app.processCommand('exit', mockRl);

      expect(mockRl.close).toHaveBeenCalled();
    });

    test('should handle quit command', () => {
      const mockRl = { close: jest.fn() };
      app.processCommand('quit', mockRl);

      expect(mockRl.close).toHaveBeenCalled();
    });

    test('should ignore empty commands', () => {
      const mockRl = { close: jest.fn() };
      app.processCommand('   ', mockRl);

      expect(consoleOutput.length).toBe(0);
    });

    test('should show error for unknown commands', () => {
      const mockRl = { close: jest.fn() };
      app.processCommand('invalid', mockRl);

      expect(consoleOutput.join('\n')).toContain('Unknown command');
    });

    test('should be case insensitive', () => {
      jest.spyOn(settingsManager, 'getMappings').mockReturnValue({});

      const mockRl = { close: jest.fn() };
      app.processCommand('LIST', mockRl);

      expect(consoleOutput.join('\n')).toContain('No mappings');
    });
  });
});
