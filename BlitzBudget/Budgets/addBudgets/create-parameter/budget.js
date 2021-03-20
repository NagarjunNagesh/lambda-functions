const constants = require('../constants/constant');

module.exports.createParameter = (event, today) => ({
  TableName: constants.TABLE_NAME,
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :items)',
  ExpressionAttributeValues: {
    ':pk': event['body-json'].walletId,
    ':items': `Budget#${today.getFullYear()}-${(`0${today.getMonth() + 1}`).slice(-2)}`,
  },
  ProjectionExpression: 'category, date_meant_for, sk, pk',
});