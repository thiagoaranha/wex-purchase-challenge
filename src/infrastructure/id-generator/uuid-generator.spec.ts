import { UuidGenerator } from './uuid-generator';

describe('UuidGenerator', () => {
  let generator: UuidGenerator;

  beforeEach(() => {
    generator = new UuidGenerator();
  });

  it('should be defined', () => {
    expect(generator).toBeDefined();
  });

  it('should generate a valid UUID', () => {
    const result = generator.generate();
    // basic regex for uuid v4
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(result).toMatch(uuidRegex);
  });

  it('should generate unique UUIDs on subsequent calls', () => {
    const uuid1 = generator.generate();
    const uuid2 = generator.generate();
    expect(uuid1).not.toBe(uuid2);
  });
});
