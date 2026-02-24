import { logger } from './logger';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi
      .spyOn(globalThis.console, 'log')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log info messages', () => {
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log with metadata', () => {
    logger.info('Test message', { userId: '123' });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log errors', () => {
    logger.error('Error message', { code: 500 });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log warnings', () => {
    logger.warn('Warning message');
    expect(consoleSpy).toHaveBeenCalled();
  });
});
