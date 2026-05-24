import { Description } from './description';
import { InvalidDescriptionError } from '../errors/purchase-domain-errors';

describe('Description', () => {
  it('should create a trimmed description', () => {
    const description = Description.create('  Office supplies  ');

    expect(description.value).toBe('Office supplies');
    expect(description.toString()).toBe('Office supplies');
  });

  it('should reject empty descriptions', () => {
    expect(() => Description.create('   ')).toThrow(InvalidDescriptionError);
  });

  it('should reject descriptions longer than 50 characters', () => {
    expect(() => Description.create('x'.repeat(51))).toThrow(
      InvalidDescriptionError,
    );
  });

  it('should compare descriptions', () => {
    expect(Description.create('A').equals(Description.create('A'))).toBe(true);
  });
});
