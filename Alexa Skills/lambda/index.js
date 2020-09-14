// Lambda Function code for Alexa.
// Paste this into your index.js file. 
// alexa.design/codegenerator

// Setup ================================================================================

const Alexa = require("ask-sdk-core");
const https = require("https");
const AWS = require('aws-sdk');
const blitzbudgetDB = require('./helper/blitz-budget');
const featureRequest = require('./helper/feature-request');

// Constants ============================================================================

// TODO: clean up debugging code
// const DEBUG = getEnvVar('DEBUG', false); // true = log to CloudWatch Logs ; false = no logging
const COGNITO_REGION = getEnvVar('COGNITO_REGION', 'eu-west-1');

const SKILL_NAME =  'Blitz Budget';
const NEED_TO_LINK_MESSAGE = 'Before we can continue, you will need to link your account to the %s skill using the card that I have sent to the Alexa app.';
const HELP_MESSAGE = 'You can say: \'alexa, hello\', \'alexa, tell me my info\' or \'alexa, who am I\'.';
const ERR_MESSAGE =  'Sorry, I can\'t understand that request. Please try again.';
const HELLO_MESSAGE = 'Hello ';
const GREETING_MESSAGE =  '. What can I do for you today? ';
const GOODBYE_MESSAGE = 'Good bye %s. It was nice talking to you. ';
const REPORT_NAME = 'Your full name is %s. ';
const REPORT_PHONE_NUMBER = 'Your phone number is <say-as interpret-as="telephone">%s</say-as>. ';
const REPORT_EMAIL_ADDRESS = 'Your email address is <say-as interpret-as="spell-out">%s</say-as>. ';
const REPORT_STREET_ADDRESS = 'Your street address is %s. ';
const FULL_NAME = '%s %s';
const NOT_SURE_OF_TYPE_MESSAGE = 'I didn\'t catch what you were interested in, so here\'s everything I know about you. ';

const invocationName = "blitz budget";

// Session Attributes 
//   Alexa will track attributes for you, by default only during the lifespan of your session.
//   The history[] array will track previous request(s), used for contextual Help/Yes/No handling.
//   Set up DynamoDB persistence to have the skill save and reload these attributes between skill sessions.

function getMemoryAttributes() {   const memoryAttributes = {
       "history":[],


       "launchCount":0,
       "lastUseTimestamp":0,

       "lastSpeechOutput":{},
       // "nextIntent":[]

       // "favoriteColor":"",
       // "name":"",
       // "namePronounce":"",
       // "email":"",
       // "mobileNumber":"",
       // "city":"",
       // "state":"",
       // "postcode":"",
       // "birthday":"",
       // "bookmark":0,
       // "wishlist":[],
   };
   return memoryAttributes;
};

const maxHistorySize = 20; // remember only latest 20 intents 


// 1. Intent Handlers =============================================

// CheckAccountLinkedHandler: This handler is always run first,
// based on the order defined in the skillBuilder.
// If no access token is present, then send the Link Account Card.
//``
const CheckAccountLinkedHandler = {
  canHandle(handlerInput) {
    // If accessToken does not exist (ie, account is not linked),
    // then return true, which triggers the "need to link" card.
    // This should not be used unless the skill cannot function without
    // a linked account.  If there's some functionality which is available without
    // linking an account, do this check "just-in-time"
    return isAccountLinked(handlerInput);
    
    /*return dbHelper.getMovies(userID)
      .then((data) => {
        var speechText = "Your movies are "
        if (data.length == 0) {
          speechText = "You do not have any favourite movie yet, add movie by saving add moviename "
        } else {
          speechText += data.map(e => e.movieTitle).join(", ")
        }
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        const speechText = "we cannot get your movie right now. Try again!"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })*/
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speakOutput = NEED_TO_LINK_MESSAGE + SKILL_NAME;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .withLinkAccountCard()
      .getResponse();
  },
};

const AMAZON_CancelIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.CancelIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay, talk to you later! ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_HelpIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let history = sessionAttributes['history'];
        let intents = getCustomIntents();
        let sampleIntent = randomElement(intents);

        let say = 'You asked for help. '; 

        let previousIntent = getPreviousIntent(sessionAttributes);
        if (previousIntent && !handlerInput.requestEnvelope.session.new) {
             say += 'Your last intent was ' + previousIntent + '. ';
         }
        // say +=  'I understand  ' + intents.length + ' intents, '

        say += ' Here something you can ask me, ' + getSampleUtterance(sampleIntent);

        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_StopIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StopIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay, talk to you later! ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_NavigateHomeIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NavigateHomeIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.NavigateHomeIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_FallbackIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.FallbackIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let previousSpeech = getPreviousSpeechOutput(sessionAttributes);

        return responseBuilder
            .speak('Sorry I didnt catch what you said, ' + stripSpeak(previousSpeech.outputSpeech))
            .reprompt(stripSpeak(previousSpeech.reprompt))
            .getResponse();
    },
};

const getCategoryBalance_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'getCategoryBalance' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        console.log('The User id retrieved is {0}', sessionAttributes.userId);
        let wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
        
        console.log('The wallets obtained are ', JSON.stringify(wallet));
        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: category 
        if (slotValues.category.heardAs && slotValues.category.heardAs !== '') {
            let category = await blitzbudgetDB.getCategoryAlexa(wallet.sk.S, slotValues.category.heardAs, slotValues.date.heardAs, responseBuilder);
            if(isEmpty(category)) {
                slotStatus += ' The ' + slotValues.category.heardAs + ' category has not been created. Do you want me to create it for the current month?';
            } else {
                slotStatus += ' Your ' + slotValues.category.heardAs + ' category has a balance of ' + category['category_total'].N + ' ' + wallet.currency.S;   
            }
        } else {
            slotStatus += 'I didn\'t quite get you. Please try again! ';
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};


const addNewTransaction_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'addNewTransaction' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
        
        console.log('The wallets obtained are ', JSON.stringify(wallet));
        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: number 
        if (slotValues.number.heardAs && slotValues.number.heardAs !== '') {
            slotStatus += ' slot number was heard as ' + slotValues.number.heardAs + '. ';
        } else {
            slotStatus += 'slot number is empty. ';
        }
        if (slotValues.number.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.number.resolved !== slotValues.number.heardAs) {
                slotStatus += 'synonym for ' + slotValues.number.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.number.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.number.heardAs + '" to the custom slot type used by slot number! '); 
        }

        if( (slotValues.number.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.number.heardAs) ) {
           // slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('addNewTransaction','number'), 'or');
        }
        //   SLOT: currency 
        if (slotValues.currency.heardAs && slotValues.currency.heardAs !== '') {
            slotStatus += ' slot currency was heard as ' + slotValues.currency.heardAs + '. ';
        } else {
            slotStatus += 'slot currency is empty. ';
        }
        if (slotValues.currency.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.currency.resolved !== slotValues.currency.heardAs) {
                slotStatus += 'synonym for ' + slotValues.currency.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.currency.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.currency.heardAs + '" to the custom slot type used by slot currency! '); 
        }

        if( (slotValues.currency.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.currency.heardAs) ) {
           // slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('addNewTransaction','currency'), 'or');
        }
        //   SLOT: categories 
        if (slotValues.categories.heardAs && slotValues.categories.heardAs !== '') {
            slotStatus += ' slot categories was heard as ' + slotValues.categories.heardAs + '. ';
        } else {
            slotStatus += 'slot categories is empty. ';
        }
        if (slotValues.categories.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.categories.resolved !== slotValues.categories.heardAs) {
                slotStatus += 'synonym for ' + slotValues.categories.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.categories.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.categories.heardAs + '" to the custom slot type used by slot categories! '); 
        }

        if( (slotValues.categories.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.categories.heardAs) ) {
           // slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('addNewTransaction','categories'), 'or');
        }
        //   SLOT: date 
        if (slotValues.date.heardAs && slotValues.date.heardAs !== '') {
            slotStatus += ' slot date was heard as ' + slotValues.date.heardAs + '. ';
        } else {
            slotStatus += 'slot date is empty. ';
        }
        if (slotValues.date.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.date.resolved !== slotValues.date.heardAs) {
                slotStatus += 'synonym for ' + slotValues.date.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.date.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.date.heardAs + '" to the custom slot type used by slot date! '); 
        }

        if( (slotValues.date.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.date.heardAs) ) {
           // slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('addNewTransaction','date'), 'or');
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const changeDefaultWallet_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'changeDefaultWallet' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: wallet 
        if (slotValues.wallet.heardAs && slotValues.wallet.heardAs !== '') {
            let allWallets = await blitzbudgetDB.getWalletFromAlexa(sessionAttributes.userId, responseBuilder);
            let changeWallet = await blitzbudgetDB.changeDefaultWalletAlexa(sessionAttributes.userId, allWallets, slotValues.wallet.heardAs);
            slotStatus += changeWallet;
        } else {
            slotStatus += 'I didn\'t quite get you. Please try again! ';
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const changeDefaultAccount_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'changeDefaultAccount' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
        
        console.log('The wallets obtained are ', JSON.stringify(wallet));
        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: account 
        if (slotValues.account.heardAs && slotValues.account.heardAs !== '') {
            let allAccounts = await blitzbudgetDB.getAccountFromAlexa(wallet.sk.S);
            let changeAccount = await blitzbudgetDB.changeDefaultAccountAlexa(allAccounts, slotValues.account.heardAs);
            slotStatus = changeAccount;
        } else {
            slotStatus = 'I didn\'t quite get you. Please try again! ';
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const addNewBudget_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'addNewBudget' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = '';
        let slotStatus = '';
        let resolvedSlot, wallet;

        let slotValues = getSlotValues(request.intent.slots); 
        if(isNotEmpty(slotValues.currency.heardAs)) {
            let allWallets = await blitzbudgetDB.getWalletFromAlexa(sessionAttributes.userId, responseBuilder);
            wallet = blitzbudgetDB.calculateWalletFromAlexa(allWallets, slotValues.currency.heardAs); 
            console.log("The calculate wallet is ", JSON.stringify(wallet), ". The currency name is ", slotValues.currency.heardAs);
        } else {
            wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
            console.log("The default wallet is ", wallet.currency.S);
        }
        
        let currentDate =  new Date();
        currentDate = currentDate.getFullYear() + '-' + ("0" + (Number(currentDate.getMonth()) + 1)).slice(-2);
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: category 
        if(isEmpty(wallet)) {
            slotStatus += 'The requested currency cannot be found. Do you want me to create them for you?';
        } else {
            // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions
    
            // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
            //   SLOT: category 
            if (slotValues.category.heardAs && slotValues.category.heardAs !== '') {
                let category = await blitzbudgetDB.getCategoryAlexa(wallet.sk.S, slotValues.category.heardAs, currentDate, responseBuilder);
                if(isEmpty(category)) {
                    slotStatus += ' The ' + slotValues.category.heardAs + ' category has not been created. Do you want me to create it for the current month?';
                } else {
                    let budget = await blitzbudgetDB.getBudgetAlexaAmount(wallet.sk.S, category.sk.S, currentDate, responseBuilder);
                    if(isEmpty(budget)) {
                        slotStatus += await blitzbudgetDB.addBudgetAlexaAmount(wallet.sk.S, category.sk.S, slotValues.amount.heardAs, currentDate, slotValues.category.heardAs);
                    } else {
                        slotStatus += ' The ' + slotValues.category.heardAs + ' budget has already been created. Do you want me to update the existing budget amount?';
                    }
                }
            } else {
                slotStatus += 'I didn\'t quite get you. Please try again! ';
            }
            
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const addNewGoal_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'addNewGoal' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from addNewGoal. ';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: goaltype 
        if (slotValues.goaltype.heardAs && slotValues.goaltype.heardAs !== '') {
            slotStatus += ' slot goaltype was heard as ' + slotValues.goaltype.heardAs + '. ';
        } else {
            slotStatus += 'slot goaltype is empty. ';
        }
        if (slotValues.goaltype.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.goaltype.resolved !== slotValues.goaltype.heardAs) {
                slotStatus += 'synonym for ' + slotValues.goaltype.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.goaltype.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.goaltype.heardAs + '" to the custom slot type used by slot goaltype! '); 
        }

        if( (slotValues.goaltype.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.goaltype.heardAs) ) {
           // slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('addNewGoal','goaltype'), 'or');
        }
        //   SLOT: amount 
        if (slotValues.amount.heardAs && slotValues.amount.heardAs !== '') {
            slotStatus += ' slot amount was heard as ' + slotValues.amount.heardAs + '. ';
        } else {
            slotStatus += 'slot amount is empty. ';
        }
        if (slotValues.amount.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.amount.resolved !== slotValues.amount.heardAs) {
                slotStatus += 'synonym for ' + slotValues.amount.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.amount.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.amount.heardAs + '" to the custom slot type used by slot amount! '); 
        }

        if( (slotValues.amount.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.amount.heardAs) ) {
           // slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('addNewGoal','amount'), 'or');
        }
        //   SLOT: currency 
        if (slotValues.currency.heardAs && slotValues.currency.heardAs !== '') {
            slotStatus += ' slot currency was heard as ' + slotValues.currency.heardAs + '. ';
        } else {
            slotStatus += 'slot currency is empty. ';
        }
        if (slotValues.currency.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.currency.resolved !== slotValues.currency.heardAs) {
                slotStatus += 'synonym for ' + slotValues.currency.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.currency.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.currency.heardAs + '" to the custom slot type used by slot currency! '); 
        }

        if( (slotValues.currency.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.currency.heardAs) ) {
           // slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('addNewGoal','currency'), 'or');
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const getBudgetAmount_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'getBudgetAmount' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
        
        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        
        // Date
        let currentDate =  new Date();
        currentDate = currentDate.getFullYear() + '-' + ("0" + (Number(currentDate.getMonth()) + 1)).slice(-2);
        
        //   SLOT: category 
        if (slotValues.category.heardAs && slotValues.category.heardAs !== '') {
            let category = await blitzbudgetDB.getCategoryAlexa(wallet.sk.S, slotValues.category.heardAs, currentDate, responseBuilder);
            if(isEmpty(category)) {
                slotStatus += ' The ' + slotValues.category.heardAs + ' category has not been created. Do you want me to create it for the current month?';
            } else {
                let budget = await blitzbudgetDB.getBudgetAlexaAmount(wallet.sk.S, category.sk.S, currentDate, responseBuilder);
                if(isEmpty(budget)) {
                    slotStatus += ' The ' + slotValues.category.heardAs + ' budget has not been created. Do you want me to create it for the current month?';
                } else {
                    slotStatus += ' Your ' + slotValues.category.heardAs + ' budget amount is ' + budget['planned'].N + ' ' + wallet.currency.S;   
                }
            }
        } else {
            slotStatus += 'Sorry! We did not understand your request. Please try again!';
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
}

const getBudgetBalance_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'getBudgetBalance' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
        
        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        
        // Date
        let currentDate =  new Date();
        currentDate = currentDate.getFullYear() + '-' + ("0" + (Number(currentDate.getMonth()) + 1)).slice(-2);
        
        //   SLOT: category 
        if (slotValues.category.heardAs && slotValues.category.heardAs !== '') {
            let category = await blitzbudgetDB.getCategoryAlexa(wallet.sk.S, slotValues.category.heardAs, currentDate, responseBuilder);
            if(isEmpty(category)) {
                slotStatus += ' The ' + slotValues.category.heardAs + ' category has not been created. Do you want me to create it for the current month?';
            } else {
                let budget = await blitzbudgetDB.getBudgetAlexaAmount(wallet.sk.S, category.sk.S, currentDate, responseBuilder);
                if(isEmpty(budget)) {
                    slotStatus += ' The ' + slotValues.category.heardAs + ' budget has not been created. Do you want me to create it for the current month?';
                } else {
                    let budgetBalance = Number(budget['planned'].N) + Number(category['category_total'].N);
                    slotStatus += ' Your ' + slotValues.category.heardAs + ' budget has ' + budgetBalance + ' ' + wallet.currency.S + " remaining";   
                }
            }
        } else {
            slotStatus += 'Sorry! We did not understand your request. Please try again!';
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const getTagBalance_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'getTagBalance' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
        
        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        
        // Date
        let currentDate =  new Date();
        currentDate = currentDate.getFullYear() + '-' + ("0" + currentDate.getMonth()).slice(-2);
        
        //   SLOT: tag 
        if (slotValues.tag.heardAs && slotValues.tag.heardAs !== '') {
            let tagBalance = await blitzbudgetDB.getTagAlexaBalance(wallet.sk.S, slotValues.tag.heardAs, currentDate, responseBuilder);
            if(isEmpty(tagBalance)) {
                slotStatus += ' The ' + slotValues.tag.heardAs + ' tag has not been created. Do you want me to create it for the current month?';
            } else {
                slotStatus += ' Your ' + slotValues.tag.heardAs + ' tag has a balance of ' + tagBalance + ' ' + wallet.currency.S;   
            }
        } else {
            slotStatus += 'Sorry! We did not understand your request. Please try again!';
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const changeBudgetAmount_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'changeBudgetAmount' ;
    },
    async handle(handlerInput) {
        let wallet;
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        console.log("The Budget amount is ", JSON.stringify(request.intent.slots));
        let slotValues = getSlotValues(request.intent.slots); 
        if(isNotEmpty(slotValues.currency.heardAs)) {
            let allWallets = await blitzbudgetDB.getWalletFromAlexa(sessionAttributes.userId, responseBuilder);
            wallet = blitzbudgetDB.calculateWalletFromAlexa(allWallets, slotValues.currency.heardAs); 
            console.log("The calculate wallet is ", JSON.stringify(wallet), ". The currency name is ", slotValues.currency.heardAs);
        } else {
            wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
            console.log("The default wallet is ", wallet.currency.S);
        }
        
        let say = '';
        let slotStatus = '';
        let resolvedSlot;
        
        let currentDate =  new Date();
        currentDate = currentDate.getFullYear() + '-' + ("0" + (Number(currentDate.getMonth()) + 1)).slice(-2);
        
        if(isEmpty(wallet)) {
            slotStatus += 'The requested currency cannot be found. Do you want me to create them for you?';
        } else {
            // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions
    
            // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
            //   SLOT: category 
            if (slotValues.category.heardAs && slotValues.category.heardAs !== '') {
                let category = await blitzbudgetDB.getCategoryAlexa(wallet.sk.S, slotValues.category.heardAs, currentDate, responseBuilder);
                if(isEmpty(category)) {
                    slotStatus += ' The ' + slotValues.category.heardAs + ' category has not been created. Do you want me to create it for the current month?';
                } else {
                    let budget = await blitzbudgetDB.getBudgetAlexaAmount(wallet.sk.S, category.sk.S, currentDate, responseBuilder);
                    if(isEmpty(budget)) {
                        slotStatus += ' The ' + slotValues.category.heardAs + ' budget has not been created. Do you want me to create it for the current month?';
                    } else {
                        slotStatus += await blitzbudgetDB.changeBudgetAlexaAmount(wallet.sk.S, budget.sk.S, slotValues.amt.heardAs, wallet.currency.S);
                    }
                }
            } else {
                slotStatus += 'I didn\'t quite get you. Please try again! ';
            }
            
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const getDefaultWallet_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'getDefaultWallet' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
        
        let say = 'Your default wallet is ' + wallet.currency.S;

        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const getDefaultAccount_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'getDefaultAccount' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let wallet = await blitzbudgetDB.getDefaultAlexaWallet(sessionAttributes.userId, responseBuilder);
        console.log('The wallets obtained are ', JSON.stringify(wallet));
        let walletId = wallet.sk.S;
        let defaultAccount = await blitzbudgetDB.getDefaultAlexaAccount(walletId, responseBuilder);

        let say = 'Your default account is ' + defaultAccount['bank_account_name'].S;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const addNewWallet_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'addNewWallet' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = '';
        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: currency 
        if (slotValues.currency.heardAs && slotValues.currency.heardAs !== '') {
            let matchedCurrency = blitzbudgetDB.checkIfWalletIsInvalid(slotValues.currency.heardAs);
            if(isEmpty(matchedCurrency)) {
               slotStatus = 'I couldn\'t find the currency that you mentioned. Please try again!';
            } else {
                slotStatus = await blitzbudgetDB.addWalletFromAlexa(sessionAttributes.userId, matchedCurrency);   
            }
        } else {
            slotStatus += 'I didn\'t quite get you. Please try again! ';
        }
        
        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const sendFeatureRequest_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'sendFeatureRequest' ;
    },
    async handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        let say = '';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        
        //   SLOT: tag 
        if (slotValues.search.heardAs && slotValues.search.heardAs !== '') {
            slotStatus = await featureRequest.sendFeatureRequest(slotValues.search.heardAs, sessionAttributes.email);
        } else {
            slotStatus += 'Sorry! We did not understand your request. Please try again!';
        }

        say += slotStatus;


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const LaunchRequest_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const repromptOutput = GREETING_MESSAGE;
        const speakOutput = HELLO_MESSAGE + sessionAttributes.firstName + repromptOutput;
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
    },
};

const SessionEndedHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler =  {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const request = handlerInput.requestEnvelope.request;

        console.log(`Error handled: ${error.message}`);
        // console.log(`Original Request was: ${JSON.stringify(request, null, 2)}`);
        const speakOutput = ERR_MESSAGE;

        return handlerInput.responseBuilder
            .speak(`${speakOutput}  ${error.message} `)
            .reprompt(`${speakOutput}  ${error.message} `)
            .getResponse();
    }
};


// 2. Constants ===========================================================================

    // Here you can define static data, to be used elsewhere in your code.  For example: 
    //    const myString = "Hello World";
    //    const myArray  = [ "orange", "grape", "strawberry" ];
    //    const myObject = { "city": "Boston",  "state":"Massachusetts" };

const APP_ID = undefined;  // TODO replace with your Skill ID (OPTIONAL).

// 3.  Helper Functions ===================================================================

function capitalize(myString) {

     return myString.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); }) ;
}

 
function randomElement(myArray) { 
    return(myArray[Math.floor(Math.random() * myArray.length)]); 
} 
 
function stripSpeak(str) { 
    return(str.replace('<speak>', '').replace('</speak>', '')); 
} 
 
 
 
 
function getSlotValues(filledSlots) { 
    const slotValues = {}; 
 
    Object.keys(filledSlots).forEach((item) => { 
        const name  = filledSlots[item].name; 
 
        if (filledSlots[item] && 
            filledSlots[item].resolutions && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0] && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) { 
            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) { 
                case 'ER_SUCCESS_MATCH': 
                    slotValues[name] = { 
                        heardAs: filledSlots[item].value, 
                        resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name, 
                        ERstatus: 'ER_SUCCESS_MATCH' 
                    }; 
                    break; 
                case 'ER_SUCCESS_NO_MATCH': 
                    slotValues[name] = { 
                        heardAs: filledSlots[item].value, 
                        resolved: '', 
                        ERstatus: 'ER_SUCCESS_NO_MATCH' 
                    }; 
                    break; 
                default: 
                    break; 
            } 
        } else { 
            slotValues[name] = { 
                heardAs: filledSlots[item].value || '', // may be null 
                resolved: '', 
                ERstatus: '' 
            }; 
        } 
    }, this); 
 
    return slotValues; 
} 
 
function getExampleSlotValues(intentName, slotName) { 
 
    let examples = []; 
    let slotType = ''; 
    let slotValuesFull = []; 
 
    let intents = model.interactionModel.languageModel.intents; 
    for (let i = 0; i < intents.length; i++) { 
        if (intents[i].name == intentName) { 
            let slots = intents[i].slots; 
            for (let j = 0; j < slots.length; j++) { 
                if (slots[j].name === slotName) { 
                    slotType = slots[j].type; 
 
                } 
            } 
        } 
 
    } 
    let types = model.interactionModel.languageModel.types; 
    for (let i = 0; i < types.length; i++) { 
        if (types[i].name === slotType) { 
            slotValuesFull = types[i].values; 
        } 
    } 
 
    slotValuesFull = shuffleArray(slotValuesFull); 
 
    examples.push(slotValuesFull[0].name.value); 
    examples.push(slotValuesFull[1].name.value); 
    if (slotValuesFull.length > 2) { 
        examples.push(slotValuesFull[2].name.value); 
    } 
 
 
    return examples; 
} 
 
function sayArray(myData, penultimateWord = 'and') { 
    let result = ''; 
 
    myData.forEach(function(element, index, arr) { 
 
        if (index === 0) { 
            result = element; 
        } else if (index === myData.length - 1) { 
            result += ` ${penultimateWord} ${element}`; 
        } else { 
            result += `, ${element}`; 
        } 
    }); 
    return result; 
} 
function supportsDisplay(handlerInput) // returns true if the skill is running on a device with a display (Echo Show, Echo Spot, etc.) 
{                                      //  Enable your skill for display as shown here: https://alexa.design/enabledisplay 
    const hasDisplay = 
        handlerInput.requestEnvelope.context && 
        handlerInput.requestEnvelope.context.System && 
        handlerInput.requestEnvelope.context.System.device && 
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces && 
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display; 
 
    return hasDisplay; 
} 
 
 
const welcomeCardImg = { 
    smallImageUrl: "https://s3.amazonaws.com/skill-images-789/cards/card_plane720_480.png", 
    largeImageUrl: "https://s3.amazonaws.com/skill-images-789/cards/card_plane1200_800.png" 
 
 
}; 
 
const DisplayImg1 = { 
    title: 'Jet Plane', 
    url: 'https://s3.amazonaws.com/skill-images-789/display/plane340_340.png' 
}; 
const DisplayImg2 = { 
    title: 'Starry Sky', 
    url: 'https://s3.amazonaws.com/skill-images-789/display/background1024_600.png' 
 
}; 
 
function getCustomIntents() { 
    const modelIntents = model.interactionModel.languageModel.intents; 
 
    let customIntents = []; 
 
 
    for (let i = 0; i < modelIntents.length; i++) { 
 
        if(modelIntents[i].name.substring(0,7) != "AMAZON." && modelIntents[i].name !== "LaunchRequest" ) { 
            customIntents.push(modelIntents[i]); 
        } 
    } 
    return customIntents; 
} 
 
function getSampleUtterance(intent) { 
 
    return randomElement(intent.samples); 
 
} 
 
function getPreviousIntent(attrs) { 
 
    if (attrs.history && attrs.history.length > 1) { 
        return attrs.history[attrs.history.length - 2].IntentRequest; 
 
    } else { 
        return false; 
    } 
 
} 
 
function getPreviousSpeechOutput(attrs) { 
 
    if (attrs.lastSpeechOutput && attrs.history.length > 1) { 
        return attrs.lastSpeechOutput; 
 
    } else { 
        return false; 
    } 
 
} 
 
function timeDelta(t1, t2) { 
 
    const dt1 = new Date(t1); 
    const dt2 = new Date(t2); 
    const timeSpanMS = dt2.getTime() - dt1.getTime(); 
    const span = { 
        "timeSpanMIN": Math.floor(timeSpanMS / (1000 * 60 )), 
        "timeSpanHR": Math.floor(timeSpanMS / (1000 * 60 * 60)), 
        "timeSpanDAY": Math.floor(timeSpanMS / (1000 * 60 * 60 * 24)), 
        "timeSpanDesc" : "" 
    }; 
 
 
    if (span.timeSpanHR < 2) { 
        span.timeSpanDesc = span.timeSpanMIN + " minutes"; 
    } else if (span.timeSpanDAY < 2) { 
        span.timeSpanDesc = span.timeSpanHR + " hours"; 
    } else { 
        span.timeSpanDesc = span.timeSpanDAY + " days"; 
    } 
 
 
    return span; 
 
} 
 
 
const InitMemoryAttributesInterceptor = { 
    process(handlerInput) { 
        let sessionAttributes = {}; 
        if(handlerInput.requestEnvelope.session['new']) { 
 
            sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
            let memoryAttributes = getMemoryAttributes(); 
 
            if(Object.keys(sessionAttributes).length === 0) { 
 
                Object.keys(memoryAttributes).forEach(function(key) {  // initialize all attributes from global list 
 
                    sessionAttributes[key] = memoryAttributes[key]; 
 
                }); 
 
            } 
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
 
        } 
    } 
}; 
 
const RequestHistoryInterceptor = { 
    process(handlerInput) { 
 
        const thisRequest = handlerInput.requestEnvelope.request; 
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
        let history = sessionAttributes['history'] || []; 
 
        let IntentRequest = {}; 
        if (thisRequest.type === 'IntentRequest' ) { 
 
            let slots = []; 
 
            IntentRequest = { 
                'IntentRequest' : thisRequest.intent.name 
            }; 
 
            if (thisRequest.intent.slots) { 
 
                for (let slot in thisRequest.intent.slots) { 
                    let slotObj = {}; 
                    slotObj[slot] = thisRequest.intent.slots[slot].value; 
                    slots.push(slotObj); 
                } 
 
                IntentRequest = { 
                    'IntentRequest' : thisRequest.intent.name, 
                    'slots' : slots 
                }; 
 
            } 
 
        } else { 
            IntentRequest = {'IntentRequest' : thisRequest.type}; 
        } 
        if(history.length > maxHistorySize - 1) { 
            history.shift(); 
        } 
        history.push(IntentRequest); 
 
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
    } 
 
}; 
 
 
const RequestPersistenceInterceptor = { 
    process(handlerInput) { 
 
        if(handlerInput.requestEnvelope.session['new']) { 
 
            return new Promise((resolve, reject) => { 
 
                handlerInput.attributesManager.getPersistentAttributes() 
 
                    .then((sessionAttributes) => { 
                        sessionAttributes = sessionAttributes || {}; 
 
 
                        sessionAttributes['launchCount'] += 1; 
 
                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
                        handlerInput.attributesManager.savePersistentAttributes() 
                            .then(() => { 
                                resolve(); 
                            }) 
                            .catch((err) => { 
                                reject(err); 
                            }); 
                    }); 
 
            }); 
 
        } // end session['new'] 
    } 
}; 
 
 
const ResponseRecordSpeechOutputInterceptor = { 
    process(handlerInput, responseOutput) { 
 
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
        let lastSpeechOutput = { 
            "outputSpeech":responseOutput.outputSpeech.ssml, 
            "reprompt":responseOutput.reprompt.outputSpeech.ssml 
        }; 
 
        sessionAttributes['lastSpeechOutput'] = lastSpeechOutput; 
 
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
    } 
}; 
 
const ResponsePersistenceInterceptor = { 
    process(handlerInput, responseOutput) { 
 
        const ses = (typeof responseOutput.shouldEndSession == "undefined" ? true : responseOutput.shouldEndSession); 
 
        if(ses || handlerInput.requestEnvelope.request.type == 'SessionEndedRequest') { // skill was stopped or timed out 
 
            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
            sessionAttributes['lastUseTimestamp'] = new Date(handlerInput.requestEnvelope.request.timestamp).getTime(); 
 
            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes); 
 
            return new Promise((resolve, reject) => { 
                handlerInput.attributesManager.savePersistentAttributes() 
                    .then(() => { 
                        resolve(); 
                    }) 
                    .catch((err) => { 
                        reject(err); 
                    }); 
 
            }); 
 
        } 
 
    } 
}; 

//
// HelpHandler: Handle a user request for help.
//
const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_MESSAGE)
      .getResponse();
  },
};

//
// ExitHandler: Handle the cancel and stop intents.
//
const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.CancelIntent' || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const speakOutput = GOODBYE_MESSAGE + sessionAttributes.firstName;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .withShouldEndSession(true)
      .getResponse();
  },
};

// Helper functions ========================================================

// getAttribute: Pass in array of name/value pairs and attribute name,
// return the attribute value corresponding to the provided attribute name.
//
function getAttribute(attrArray, attrName) {
  let value = 'NOTFOUND';
  for (let i = 0; i < attrArray.length; i += 1) {
    if (attrArray[i].Name === attrName) {
      value = attrArray[i].Value;
      break;
    }
  }
  return value;
}


// getUserData: Retrieve user details from Cognito IdSP
//
function getUserData(accToken) {
  return new Promise(((resolve, reject) => {
    const cognitoISP = new AWS.CognitoIdentityServiceProvider({ region: COGNITO_REGION });
    const cognitoParams = {
      AccessToken: accToken,
    };
    cognitoISP.getUser(cognitoParams, (error, data) => {
      if (error) {
        console.log('getUserData error : ', error);
        reject(error);
      } else {
        console.log('getUserData success : ', data);
        resolve(data);
      }
    });
  }));
}

function getResolvedSlotIDValue(request, slotName) {
  // assumes the first resolved value's id is the desired one
  const slot = request.intent.slots[slotName];

  if (slot &&
    slot.value &&
    slot.resolutions &&
    slot.resolutions.resolutionsPerAuthority &&
    slot.resolutions.resolutionsPerAuthority[0] &&
    slot.resolutions.resolutionsPerAuthority[0].values &&
    slot.resolutions.resolutionsPerAuthority[0].values[0] &&
    slot.resolutions.resolutionsPerAuthority[0].values[0].value &&
    slot.resolutions.resolutionsPerAuthority[0].values[0].value.name) {
    return slot.resolutions.resolutionsPerAuthority[0].values[0].value.id;
  }
  return null;
}

function isAccountLinked(handlerInput) {
  // if there is an access token, then assumed linked
  return (handlerInput.requestEnvelope.session.user.accessToken === undefined);
}

const RequestLog = {
  process(handlerInput) {
    console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
  },
};

const ResponseLog = {
  process(handlerInput) {
    console.log(`RESPONSE BUILDER = ${JSON.stringify(handlerInput)}`);
    console.log(`RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
  },
};

function getEnvVar(envVarName, defaultValue) {
  if (process.env[envVarName]) {
    return process.env[envVarName];
  }
  return defaultValue;
}

function shuffleArray(array) {  // Fisher Yates shuffle! 
 
    let currentIndex = array.length, temporaryValue, randomIndex; 
 
    while (0 !== currentIndex) { 
 
        randomIndex = Math.floor(Math.random() * currentIndex); 
        currentIndex -= 1; 
 
        temporaryValue = array[currentIndex]; 
        array[currentIndex] = array[randomIndex]; 
        array[randomIndex] = temporaryValue; 
    } 
 
    return array; 
} 

// Is Empty Check
function isEmpty(obj) {
    // Check if objext is a number or a boolean
    if (typeof (obj) == 'number' || typeof (obj) == 'boolean') return false;

    // Check if obj is null or undefined
    if (obj == null || obj === undefined) return true;

    // Check if the length of the obj is defined
    if (typeof (obj.length) != 'undefined') return obj.length == 0;

    // check if obj is a custom obj
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) return false;
    }

    // Check if obj is an element
    if (obj instanceof Element) return false;

    return true;
}

function isNotEmpty(obj) {
    return !isEmpty(obj);
}

//
// GetLinkedInfoInterceptor: Interceptor function that is executed on every
// request sent to the skill
//
const GetLinkedInfoInterceptor = {
  async process(handlerInput) {
    if (handlerInput.requestEnvelope.session.new
      && handlerInput.requestEnvelope.session.user.accessToken) {
      // This is a new session and we have an access token,
      // so get the user details from Cognito and persist in session attributes
      const userData = await getUserData(handlerInput.requestEnvelope.session.user.accessToken);
      // console.log('GetLinkedInfoInterceptor: getUserData: ', userData);
      if (userData.Username !== undefined) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.firstName = getAttribute(userData.UserAttributes, 'name');
        sessionAttributes.surname = getAttribute(userData.UserAttributes, 'family_name');
        sessionAttributes.email = getAttribute(userData.UserAttributes, 'email');
        sessionAttributes.userId = getAttribute(userData.UserAttributes, 'custom:financialPortfolioId');
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      } else {
        console.log('GetLinkedInfoInterceptor: No user data was found.');
      }
    }
  },
};

// 4. Exports handler function and setup ===================================================
const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(
        CheckAccountLinkedHandler,
        AMAZON_CancelIntent_Handler, 
        AMAZON_HelpIntent_Handler, 
        AMAZON_StopIntent_Handler, 
        AMAZON_NavigateHomeIntent_Handler, 
        AMAZON_FallbackIntent_Handler, 
        getCategoryBalance_Handler, 
        addNewTransaction_Handler, 
        changeDefaultWallet_Handler, 
        changeDefaultAccount_Handler, 
        addNewBudget_Handler, 
        addNewGoal_Handler, 
        getBudgetBalance_Handler,
        getBudgetAmount_Handler, 
        getTagBalance_Handler, 
        changeBudgetAmount_Handler, 
        getDefaultWallet_Handler, 
        getDefaultAccount_Handler, 
        addNewWallet_Handler,
        sendFeatureRequest_Handler,
        LaunchRequest_Handler, 
        HelpHandler,
        ExitHandler,
        SessionEndedHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(InitMemoryAttributesInterceptor)
    .addRequestInterceptors(RequestHistoryInterceptor)
    .addRequestInterceptors(GetLinkedInfoInterceptor)

   // .addResponseInterceptors(ResponseRecordSpeechOutputInterceptor)

 // .addRequestInterceptors(RequestPersistenceInterceptor)
 // .addResponseInterceptors(ResponsePersistenceInterceptor)

 // .withTableName("askMemorySkillTable")
 // .withAutoCreateTable(true)

    .lambda();


// End of Skill code -------------------------------------------------------------
