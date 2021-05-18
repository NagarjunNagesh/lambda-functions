const dateParameter = require('../../../create-parameter/date');
const mockRequest = require('../../fixtures/request/processBlitzBudgetTable');

describe('dateParameter: createParameter', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.AWS_LAMBDA_REGION = '1';
    process.env.TABLE_NAME = '2';
  });
  const event = mockRequest;
  const walletId = event.Records[0].dynamodb.NewImage.pk.S;
  const sk = event.Records[0].dynamodb.NewImage.sk.S;
  test('With Data: Success', () => {
    const parameters = dateParameter.createParameter(walletId, sk, 'differnce', 'income', 'expense');
    expect(parameters).not.toBeUndefined();
    expect(parameters.TableName).not.toBeUndefined();
    expect(parameters.Key.pk).not.toBeUndefined();
    expect(parameters.Key.sk).not.toBeUndefined();
    expect(parameters.UpdateExpression).not.toBeUndefined();
    expect(parameters.ConditionExpression).not.toBeUndefined();
    expect(parameters.ExpressionAttributeValues[':ab']).not.toBeUndefined();
    expect(parameters.ExpressionAttributeValues[':it']).not.toBeUndefined();
    expect(parameters.ExpressionAttributeValues[':et']).not.toBeUndefined();
    expect(parameters.ReturnValues).not.toBeUndefined();
  });
});
