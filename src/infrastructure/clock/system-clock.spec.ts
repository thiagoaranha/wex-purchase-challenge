import { SystemClock } from './system-clock';

describe('SystemClock', () => {
  let clock: SystemClock;

  beforeEach(() => {
    clock = new SystemClock();
  });

  it('should be defined', () => {
    expect(clock).toBeDefined();
  });

  it('should return a Date instance on now()', () => {
    const result = clock.now();
    expect(result).toBeInstanceOf(Date);
  });

  it('should return the current time or close to it', () => {
    const before = new Date().getTime();
    const result = clock.now().getTime();
    const after = new Date().getTime();

    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});
