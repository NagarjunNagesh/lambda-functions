// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'eu-west-1'});

// Create the DynamoDB service object
var docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log("adding BankAccounts for ", JSON.stringify(event['body-json']));
    await addNewBankAccounts(event).then(function(result) {
       console.log("successfully saved the new BankAccounts");
    }, function(err) {
       throw new Error("Unable to add the BankAccounts " + err);
    });
        
    return event;
};

function addNewBankAccounts(event) {
    let today = new Date();
    let randomValue = "BankAccount#" + today.toISOString(); 
        
    var params = {
      TableName:'blitzbudget',
      Item:{
            "pk": event['body-json'].financialPortfolioId,
            "sk": randomValue,
            "account_type": event['body-json'].accountType,
            "bank_account_name": event['body-json'].bankAccountName,
            "linked": event['body-json'].linked,
            "account_balance": event['body-json'].accountBalance,
            "selected_account": event['body-json'].selectedAccount,
      }
    };
    
    console.log("Adding a new item...");
    return new Promise((resolve, reject) => {
      docClient.put(params, function(err, data) {
          if (err) {
            console.log("Error ", err);
            reject(err);
          } else {
            resolve({ "success" : data});
            event['body-json'].id= randomValue;
          }
      });
    });
    
}