const fetchBudget = require('../../../fetch/budget');
const mockRequest = require('../../fixtures/request/existingCategory.json');
const mockResponse = require('../../fixtures/response/fetchBudget.json');

const documentClient = {
  query: jest.fn(() => ({
    promise: jest.fn().mockResolvedValueOnce(mockResponse),
  })),
};

describe('Fetch Budget item', () => {
  test('Without Matching Budget: Success', async () => {
    const response = await fetchBudget
      .getBudgetsItem(new Date('2021-02'), mockRequest, documentClient);
    expect(response).not.toBeUndefined();
    expect(response.Budget).not.toBeUndefined();
    expect(response.Budget.category).not.toBeUndefined();
    expect(response.Budget.category).toBe(mockRequest['body-json'].category);
    expect(documentClient.query).toHaveBeenCalledTimes(1);
  });
});

describe('Fetch Budget item: Error', () => {
  const documentClientWithError = {
    query: jest.fn(() => ({
      promise: jest.fn().mockRejectedValueOnce(mockResponse),
    })),
  };
  test('Without Matching Budget: Error Scenario', async () => {
    await fetchBudget
      .getBudgetsItem(new Date('2021-02'), mockRequest, documentClientWithError).catch((err) => {
        expect(err).not.toBeUndefined();
      });
    expect(documentClientWithError.query).toHaveBeenCalledTimes(1);
  });
});
