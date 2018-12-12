import * as functions from 'firebase-functions';
import * as Web3 from "web3"
import * as admin from 'firebase-admin';
import * as rateUpFunction from './rateUp';

admin.initializeApp();
const db = admin.firestore()
import { WEB3_PROVIDER_ADDRESS } from "./config";

// set infura provider for web3
const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_ADDRESS))

// Creates ethereum account for every new user 
// assign public key, private key to user firestore document
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
        balance: 0
    })
});

// Rates up selected user (data.uid) in BouncingLine by user who invoked the action (context.auth.uid)
export const rateUp = functions.https.onCall(
    (data, context) => rateUpFunction.handler(data, context, db),
);

