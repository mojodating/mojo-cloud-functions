import * as functions from 'firebase-functions'
import * as Web3 from 'web3'
import * as admin from 'firebase-admin'
import * as rateUpFunction from './rateUp'
import * as sendJoTokens from './sendJoTokens'
import * as getBalance from './getBalance'
import * as drinkTypes from './drinkTypes'
import * as myDrinks from './myDrinks'
import * as buyDrink from './buyDrink'
import { WEB3_PROVIDER_ADDRESS } from './config'

admin.initializeApp();

const db = admin.firestore()
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
export const rateUp = functions.https.onCall(
    (data, context) => rateUpFunction.handler(data, context, db, web3),
);

exports.sendJoTokens = functions.https.onCall((data, context) => {
    return sendJoTokens.handler(data, context, db, web3)
})

exports.getBalance = functions.https.onCall((data) => {
    return getBalance.handler(data, web3)
})

exports.drinkTypes = functions.https.onCall(() => {
    return drinkTypes.handler(db)
})

exports.myDrinks = functions.https.onCall((data, context) => {
    return myDrinks.handler(context, db)
})

exports.buyDrink = functions.https.onCall((data, context) => {
    return buyDrink.handler(data, context, db, web3)
})
