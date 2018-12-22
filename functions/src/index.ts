import * as functions from 'firebase-functions'
import * as Web3 from 'web3'
import * as admin from 'firebase-admin'
import * as rateFunction from './rate';
import * as sendJoTokens from './sendJoTokens'
import * as getBalance from './getBalance'
import * as sendMessageFunction from './sendMessage';
import * as getMessagesFunction from './getMessages';
import * as getConversationsFunction from './getConversations';
import * as sendConversationRequestFunction from './sendConversationRequest';
import * as sendFeedbackFunction from './sendFeedback';
import { WEB3_PROVIDER_ADDRESS } from './config'

admin.initializeApp();

const db = admin.firestore()
const rtdb = admin.database();
const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_ADDRESS))

// This trigger is executed on every new user added to database
// It creates ethereum key pair and stores it in user document
export const onUserCreate = 
functions.firestore.document('users/{userId}').onCreate((snapshot, context) => {
    console.log('A new user has been added.')

    const account = web3.eth.accounts.create()
    const address = account.address
    const privateKey = account.privateKey
    
    console.log(`Generated ethereum address: ${address} for new user`)
    
    return snapshot.ref.update({
        address: address,
        privateKey: privateKey,
        nonce: 0
    })
});

// Rates up selected user (data.uid) in BouncingLine by user who invoked the action (context.auth.uid)
export const rate = functions.https.onCall(
    (data, context) => rateFunction.handler(data, context, db),
);

exports.sendJoTokens = functions.https.onCall((data, context) => {
    sendJoTokens.handler(data, context, db, web3)
})

exports.getBalance = functions.https.onCall((data) => {
    return getBalance.handler(data, web3)
})

// Adds message (data.text) from user (context.auth.uid) to user (data.userUID) to real time database
export const sendMessage = functions.https.onCall(
    (data, context) => sendMessageFunction.handler(data, context, rtdb, db),
);

// Gets messages from user (context.auth.uid) to user (data.userUID) from real time database
export const getMessages = functions.https.onCall(
    (data, context) => getMessagesFunction.handler(data, context, rtdb),
);

// Gets conversations of user (context.auth.uid) from real time database
export const getConversations = functions.https.onCall(
    (data, context) => getConversationsFunction.handler(data, context, db),
);

// Gets conversations of user (context.auth.uid) from real time database
export const sendConversationRequest = functions.https.onCall(
    (data, context) => sendConversationRequestFunction.handler(data, context, rtdb, db),
);

// Gets conversations of user (context.auth.uid) from real time database
export const sendFeedback = functions.https.onCall(
    (data, context) => sendFeedbackFunction.handler(data, context, db),
);
