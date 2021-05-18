module.exports.createParameter = (pk, today) => ({
  TableName: process.env.TABLE_NAME,
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :items)',
  ExpressionAttributeValues: {
    ':pk': pk,
    ':items': `Date#${today.substring(0, 4)}-${today.substring(5, 7)}`,
  },
  ProjectionExpression: 'pk, sk',
});
