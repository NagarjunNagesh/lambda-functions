function AddCategory() {}

const addCategoryParameter = require('../create-parameter/add-category');

AddCategory.prototype.createCategoryItem = async (
  event,
  categoryId,
  categoryName,
  documentClient,
) => {
  const params = addCategoryParameter.createParameter(event, categoryId, categoryName);

  console.log('Adding a new item...');
  const response = await documentClient.update(params).promise();

  return { Category: response.Attributes };
};

// Export object
module.exports = new AddCategory();
