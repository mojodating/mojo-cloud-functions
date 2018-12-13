import * as functions from 'firebase-functions';
import * as Web3 from "web3"
import * as admin from 'firebase-admin';
import * as rateUpFunction from './rateUp';

admin.initializeApp();
const db = admin.firestore()
import { WEB3_PROVIDER_ADDRESS } from "./config";
const fs = require("fs")
const Tx = require('ethereumjs-tx');
const stripHexPrefix = require('strip-hex-prefix');

const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_ADDRESS))
const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
const parsed = JSON.parse(source)

// This trigger is executed on every new user added to database
// It creates ethereum key pair and stores it in user document
export const onUserCreate = 
functions.firestore.document('users/{userId}').onCreate((snapshot, context) => {
    console.log('A new user has been added.')

    const account = web3.eth.accounts.create()
    const address = account.address
    const privateKey = stripHexPrefix(account.privateKey)
    
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

// Sends Jo tokens from signed user wallet to another address
// data - {"to": "recipient_address", "value": sent_amount_of_wei}
export const sendJoTokens = functions.https.onCall((data, context) => {
    // read env variables
    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    console.log(`jotokenaddress: ${jotokenAddress}`)
    //const relayerKey = process.env.RELAYER_PRIVATE_KEY

    if(!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'Signed out user call')
    }

    if(!web3.utils.isAddress(data.to)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid recipient address')
    }

    if(!(typeof data.value === 'number') || data.value <= 0) {
       throw new functions.https.HttpsError('invalid-argument', 'Sent value shall be positive number') 
    }

    console.log(`Send ${data.value} JO tokens from x to ${data.to}`)

    return admin.firestore().doc(`users/${context.auth.uid}`).get()
    .then(snapshot => {
        console.log(`to: ${data.to}, value: ${data.value}`)
        const JOToken = new web3.eth.Contract(parsed.abi, jotokenAddress)

        const snap = snapshot.data()
        const sender = snap.address
        const senderKey = new Buffer(snap.privateKey, 'hex');

        console.log(`Sender: ${sender} senderKey: ${snap.privateKey}`)

        return web3.eth.getTransactionCount(sender)
        .then( count => {
            let rawTransaction = {
                "from": sender,
                "nonce": web3.toHex(count),
                "gasPrice": "0x04e3b29200",
                "gasLimit": "0x7458",
                "to": jotokenAddress,
                "value": "0x0",
                "data": JOToken.methods.transfer(data.to, data.value).encodeABI(),
                "chainId": 0x04
            };
            console.log(rawTransaction);
            const tx = new Tx(rawTransaction);
            tx.sign(senderKey);
            const serializedTx = tx.serialize();
            return `{${rawTransaction}}`;
        })
        .catch(err => {
            console.log('Error:', err);
            throw err;
        });
    })
    .catch(err => {
        console.log('Failure:', err);
        throw err;
    });
})
