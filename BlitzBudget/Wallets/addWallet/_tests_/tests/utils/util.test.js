const util = require('../../../utils/util');

describe('isEmpty', () => {
  test('With Data: Success', () => {
    expect(util.isEmpty('en')).toBe(false);
  });

  test('Without Data: Success', () => {
    expect(util.isEmpty('')).toBe(true);
    expect(util.isEmpty(null)).toBe(true);
  });
});

describe('isNotEmpty', () => {
  test('With Data: Success', () => {
    expect(util.isNotEmpty('en')).toBe(true);
  });

  test('Without Data: Success', () => {
    expect(util.isNotEmpty('')).toBe(false);
    expect(util.isNotEmpty(null)).toBe(false);
  });
});