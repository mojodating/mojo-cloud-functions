import * as functions from 'firebase-functions'
import * as Web3 from 'web3'
import * as admin from 'firebase-admin'
import * as rateFunction from './rate';
import * as sendJoTokens from './sendJoTokens'
import * as sendDrink from './sendDrink'
import * as getBalance from './getBalance'
import * as buyDrink from './buyDrink'
import * as sendConversationRequestFunction from './sendConversationRequest';
import * as sendFeedbackFunction from './sendFeedback';
import * as onInsideHouseTrigger from './onInsideHouse'
import * as onMessageCreateTrigger from './onMessageCreate'
import * as editUserDataFunction from './editUserData';
import * as shortid from 'shortid';
import { WEB3_PROVIDER_ADDRESS } from './config'

admin.initializeApp();

const db = admin.firestore()
const messaging = admin.messaging()
const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_ADDRESS))

// This trigger is executed on every new user added to database
// It creates ethereum key pair and stores it in user document
// export const onUserCreate = 
// functions.firestore.document('users/{userId}').onCreate((snapshot, context) => {
//     console.log('A new user has been added.')

//     const account = web3.eth.accounts.create()
//     const address = account.address
//     const privateKey = account.privateKey
    
//     console.log(`Generated ethereum address: ${address} for new user`)
    
//     return snapshot.ref.update({
//         address: address,
//         privateKey: privateKey,
//         nonce: 0,
//         insideHouse: false
//     })
// });

// This trigger is executed on every new user added to authentication list in Firebase
// It creates invitatinoCode, ethereum key pair and stores it in user document
export const onUserCreate = functions.auth.user().onCreate((user) => {
    console.log('A new user has been added.')

    const account = web3.eth.accounts.create()
    const address = account.address
    const privateKey = account.privateKey
    
    console.log(`Generated ethereum address: ${address} for user ${user.uid}`)
    return db.collection('users').doc(user.uid).set({
        uid: user.uid,
        invitationCode: shortid.generate(),
        address: address,
        privateKey: privateKey,
        nonce: 0,
        insideHouse: false
    });
})

// This function is triggered by user metadata change
export const onInsideHouse = functions.firestore
.document('users/{userId}').onUpdate(
    (change, context) => onInsideHouseTrigger.handler(messaging, web3, change)
)

// on message create accept request
export const onMessageCreate = functions.firestore
.document('conversations/{conversationId}/messages/{messageId}').onCreate(
    (snap, context) => onMessageCreateTrigger.handler(snap, context, db, messaging)
)

// Rates up selected user (data.uid) in BouncingLine by user who invoked the action (context.auth.uid)
export const rate = functions.https.onCall(
    (data, context) => rateFunction.handler(data, context, db),
);

exports.sendJoTokens = functions.https.onCall((data, context) => {
    return sendJoTokens.handler(data, context, db, web3)
})

exports.sendDrink = functions.https.onCall((data, context) => {
    return sendDrink.handler(data, context, db)
})

exports.getBalance = functions.https.onCall(
    (data, context) => getBalance.handler(data, db, web3)
)

exports.buyDrink = functions.https.onCall((data, context) => {
    return buyDrink.handler(data, context, db, web3)
})

// Gets conversations of user (context.auth.uid) from real time database
export const sendConversationRequest = functions.https.onCall(
    (data, context) => sendConversationRequestFunction.handler(data, context, db, web3, messaging),
);

// Gets conversations of user (context.auth.uid) from real time database
export const sendFeedback = functions.https.onCall(
    (data, context) => sendFeedbackFunction.handler(data, context, db),
);

export const updateToken = functions.https.onCall((data, context) => {
    const ref = db.collection('users').doc(context.auth.uid);
    return ref.update({
        token: data.token
    })
})

export const editUserData = functions.https.onCall(
    (data, context) => editUserDataFunction.handler(data, context, db, web3),
);
