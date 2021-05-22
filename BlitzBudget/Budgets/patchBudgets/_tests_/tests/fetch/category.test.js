const fetchCategory = require('../../../fetch/category');
const mockRequest = require('../../fixtures/request/patchBudgets.json');
const mockResponse = require('../../fixtures/response/fetchCategory.json');

const documentClient = {
  query: jest.fn(() => ({
    promise: jest.fn().mockResolvedValueOnce(mockResponse),
  })),
};

describe('Fetch Category item', () => {
  test('Without Matching Category: Success', async () => {
    const response = await fetchCategory
      .getCategoryData(mockRequest, new Date('2021-03'), documentClient);
    expect(response).not.toBeUndefined();
    expect(response.Category).not.toBeUndefined();
    expect(response.Category.sk).not.toBeUndefined();
    expect(response.Category.pk).not.toBeUndefined();
    expect(documentClient.query).toHaveBeenCalledTimes(1);
  });
});

describe('Fetch Category item: Error', () => {
  const documentClientWithError = {
    query: jest.fn(() => ({
      promise: jest.fn().mockRejectedValueOnce(mockResponse),
    })),
  };
  test('Without Matching Category: Error Scenario', async () => {
    await fetchCategory
      .getCategoryData(mockRequest, new Date('2021-03'), documentClientWithError).catch((err) => {
        expect(err).not.toBeUndefined();
      });
    expect(documentClientWithError.query).toHaveBeenCalledTimes(1);
  });
});
