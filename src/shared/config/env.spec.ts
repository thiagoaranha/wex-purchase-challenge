import { resolve } from 'node:path';

describe('env config', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.dontMock('dotenv');
  });

  it('should load the root .env file explicitly', () => {
    const mockConfig = jest.fn();

    jest.doMock('dotenv', () => ({
      config: mockConfig,
    }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./env');
    });

    expect(mockConfig).toHaveBeenCalledWith({
      path: resolve(process.cwd(), '.env'),
      quiet: true,
    });
  });
});
