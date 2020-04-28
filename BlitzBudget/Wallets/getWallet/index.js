// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'eu-west-1'});

// Create the DynamoDB service object
var docClient = new AWS.DynamoDB.DocumentClient({region: 'eu-west-1'});


exports.handler = async (event) => {
  console.log("fetching item for the financialPortfolioId ", event.params.querystring.financialPortfolioId);
  let goalData = [];
  
    await getGoalItem(event.params.querystring.financialPortfolioId).then(function(result) {
       goalData = result;
    }, function(err) {
       throw new Error("Unexpected error occured while fetching the goal " + err);
    });

    return goalData;
};


// Get goal Item
function getGoalItem(financialPortfolioId) {
    var params = {
      TableName: 'blitzbudget',
      KeyConditionExpression   : "pk = :financialPortfolioId and begins_with(sk, :items)",
      ExpressionAttributeValues: {
          ":financialPortfolioId": financialPortfolioId,
          ":items": "Wallet#"
      },
      ProjectionExpression: "currency, pk, sk, read_only"
    };
    
    // Call DynamoDB to read the item from the table
    return new Promise((resolve, reject) => {
        docClient.query(params, function(err, data) {
          if (err) {
            console.log("Error ", err);
            reject(err);
          } else {
            console.log("data retrieved ", JSON.stringify(data.Items));
            resolve(data);
          }
        });
    });
}