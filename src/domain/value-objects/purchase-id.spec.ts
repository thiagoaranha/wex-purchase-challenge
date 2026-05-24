import { PurchaseId } from './purchase-id';
import { InvalidPurchaseIdError } from '../errors/purchase-domain-errors';

describe('PurchaseId', () => {
  it('should create a unique identifier when no value is provided', () => {
    const first = PurchaseId.create();
    const second = PurchaseId.create();

    expect(first.value).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second.value).toMatch(/^[0-9a-f-]{36}$/i);
    expect(first.value).not.toBe(second.value);
  });

  it('should create a normalized identifier from a valid UUID', () => {
    const id = PurchaseId.create('8C5ED6B1-8E1D-4C96-8DC0-6E10A05CB4C1');

    expect(id.value).toBe('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1');
  });

  it('should reject invalid identifiers', () => {
    expect(() => PurchaseId.create('invalid')).toThrow(InvalidPurchaseIdError);
  });

  it('should compare identifiers', () => {
    expect(
      PurchaseId.create('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1').equals(
        PurchaseId.create('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1'),
      ),
    ).toBe(true);
  });

  it('should stringify identifiers', () => {
    const id = PurchaseId.create('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1');

    expect(id.toString()).toBe('8c5ed6b1-8e1d-4c96-8dc0-6e10a05cb4c1');
  });
});
