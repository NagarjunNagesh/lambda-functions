const fetchCategory = require('../../../fetch/category');
const mockRequest = require('../../fixtures/request/getTransactions.json');
const mockResponse = require('../../fixtures/response/fetchCategory.json');

const documentClient = {
  query: jest.fn(() => ({
    promise: jest.fn().mockResolvedValueOnce(mockResponse),
  })),
};

describe('Fetch Category item', () => {
  const event = mockRequest;
  test('Without Matching Category: Success', async () => {
    const response = await fetchCategory
      .getCategoryData(event, '2021-02', '2021-03', documentClient);
    expect(response).not.toBeUndefined();
    expect(response.Category).not.toBeUndefined();
    expect(documentClient.query).toHaveBeenCalledTimes(1);
  });
});