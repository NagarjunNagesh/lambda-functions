function FetchCategory() {}

const util = require('../utils/util');
const categoryParameter = require('../create-parameter/category');

FetchCategory.prototype.getCategoryData = async (event, today, documentClient) => {
  const params = categoryParameter.createParameter(event, today);

  // Call DynamoDB to read the item from the table
  const response = await documentClient.query(params).promise();

  let categories;
  if (util.isNotEmpty(response.Items)) {
    response.Items.forEach((category) => {
      if (util.isEqual(category.category_type, event['body-json'].categoryType)
        && util.isEqual(category.category_name, event['body-json'].category)) {
        console.log('Found a match for the mentioned category %j', category.sk);
        categories = category;
      }
    });
  }

  if (util.isEmpty(categories)) {
    console.log('No matching categories found');
  }

  return {
    Category: categories,
  };
};

// Export object
module.exports = new FetchCategory();
