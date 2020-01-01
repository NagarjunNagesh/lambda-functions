const AWS = require('aws-sdk')
AWS.config.update({region: 'eu-west-1'});
let cognitoIdServiceProvider = new AWS.CognitoIdentityServiceProvider();
let lambda = new AWS.Lambda();
let params = {
    FunctionName: 'retrieveClaimsWithAuthHead', // the lambda function we are going to invoke
    InvocationType: 'RequestResponse',
    LogType: 'Tail'
};
// Create the DynamoDB service object
let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

exports.handler = async function(event, context) {
    
    // Waits for the first call to be satisfied
    let lamErr = '';
    await invokeLambda(event).then(function(result) {
       console.log("The Email ID matches.");
       lamErr = result;
    }, function(err) {
       throw new Error("Error Authenticating JWT token and Matching the given Email ID's " + err);
    });
    
    // If Email ID is populated then execute the update currency
    if(lamErr != '' && lamErr.email) {
        let currency = '';
        await getItem(event).then(function(result) {
           currency = result;
        }, function(err) {
           throw new Error("Currency information cannot be obtained " + err);
        });
        
        // If Dynamo DB response is positive
        if(currency != '' && currency.currency) {
            await updateCogItem(currency.currency, event);
        }
    }
    
    return event;
};

// Invoke Lambda retrieveClaim function
function invokeLambda(event) {
    // Authorization 
      params.Payload = JSON.stringify({ "Authorization" :  event.params.header.Authorization});
    
      return new Promise((resolve, reject) => {
           lambda.invoke(params, function(err, data) {
               let payLoad = JSON.parse(data.Payload);
                if (err || payLoad.status == '401') {
                  console.log("Error occurred while authenticating JWT Token - " + data.Payload);
                  reject(err);
                } else {
                   let emailFromJWTToken = JSON.parse(data.Payload).email;
                   if(emailFromJWTToken == event['body-json'].userName) {
                      resolve({ "email" : emailFromJWTToken});
                   } else {
                      console.log(" Entered Email address - " + event['body-json'].userName + ' is not equal to JWT Token Email - ' + emailFromJWTToken);
                      reject("email address mismatch");
                   }
                }
            });
       }); 
}

function getItem(event, context) {
        let cty = event.params.header['CloudFront-Viewer-Country'];
        
        let ddbParams = {
          AttributesToGet: [
             "currency"
          ],
          TableName: 'cf-country-to-currency',
          Key: {
                country: {
                    S: cty
                }
          }
        };
        
        // Call DynamoDB to read the item from the table
        return new Promise((resolve, reject) => {
            ddb.getItem(ddbParams, function(err, data) {
              if (err) {
                console.log("Error ", err);
                reject(err);
              } else {
                console.log("Success ", data.Item.currency.S);
                resolve({ "currency" : data.Item.currency.S});
              }
            });
        });
}

function updateCogItem(currency, event) {
       let accepLan = JSON.stringify(event.params.header['Accept-Language']);
        const params = {
            UserAttributes: [
              {
                  Name: 'locale',
                  Value: accepLan.substring(1,6),
              },
              {
                  Name: 'custom:currency',
                  Value: currency,
              }
            ],
            UserPoolId: 'eu-west-1_cjfC8qNiB',
            Username: event['body-json'].userName,
        };
        
        return new Promise((resolve, reject) => {
            cognitoIdServiceProvider.adminUpdateUserAttributes(params, function(err, data) {
                if (err) reject(err); // an error occurred
                else {
                    event['body-json'].currency = currency; // Add currency to the reponse event
                    event['body-json'].locale = accepLan.substring(1,6); // Add locale to the response event
                    resolve(event); // successful response
                }
            });
        });
}