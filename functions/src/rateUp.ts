import * as functions from 'firebase-functions';
import * as util from './util'
import { HOUSE_ENTERANCE_THRESHOLD, HOUSE_ENTERANCE_REWARD } from "./config";
const fs = require('fs')
const Tx = require('ethereumjs-tx')

let checkIfRated
let payHouseReward

// Handler for rateUp function
// data - { uid: string }
// context - Firebase https.onCall Context
// db - database to use in function
export const handler = (data, context, db, web3) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.uid === 'string') || data.uid.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'one arguments "text" containing the message text to add.');
    }

    const userRef = db.collection('users').doc(data.uid);
    return db.runTransaction(t => t.get(userRef)
        .then(doc => checkIfRated(data, context, db)
            .then(() => {
                const newBouncingLineRating = (doc.data().bouncingLineRating ? doc.data().bouncingLineRating : 0) + 1;
                if (newBouncingLineRating >= HOUSE_ENTERANCE_THRESHOLD) {
                    return payHouseReward(web3, doc.data().address)
                        .then(t.update(userRef, { bouncingLineRating: newBouncingLineRating, insideHouse: true }));
                }
                return t.update(userRef, { bouncingLineRating: newBouncingLineRating });
            })
            .catch(err => {
                console.error('err: ', err);
                throw new functions.https.HttpsError('failed-precondition', 'This user has already been rated');
            })
        ).catch(err => {
            console.log('Transaction failure:', err);
            throw err;
        })
    ).then(result => {
        const bouncingLineRatingRef = db.collection('bouncingLineRating').doc(context.auth.uid);
        return db.runTransaction(t => t.get(bouncingLineRatingRef)
            .then(doc => {
                if (doc.exists) {
                    const docData = doc.data();
                    if (docData.ratedUsers && docData.ratedUsers.filter(item => item === data.uid).length > 0) {
                        return null;
                    }
                    const newRatedUsers = [
                        ...docData.ratedUsers,
                        data.uid
                    ];
                    return t.update(bouncingLineRatingRef, { ratedUsers: newRatedUsers });
                }
                return bouncingLineRatingRef.set({ ratedUsers: [data.uid] });
            }));
    }).catch(err => {
        console.log('Transaction failure:', err);
        throw err;
    });
}

checkIfRated = (data, context, db) => {
    return new Promise((resolve, reject) => {
        const bouncingLineRatingRef = db.collection('bouncingLineRating').doc(context.auth.uid);
        bouncingLineRatingRef.get().then(doc => {
            if (doc.exists) {
                const alreadyRated = doc.data()
                    .ratedUsers
                    .filter(item => item === data.uid)
                    .length > 0;
                if (alreadyRated) {
                    reject();
                } else {
                    resolve();
                }
            } else {
                resolve();
            }
        });
    });
}

payHouseReward = (web3, to) => {
    console.log('payHouseReward')

    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    // create JOToken instance
    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, jotokenAddress)

    return web3.eth.getTransactionCount(relayer)
    .then(relayerNonce => {
        // create raw transaction and sign it by relayer
        const rawTransaction = {
            from: relayer,
            nonce: web3.utils.toHex(relayerNonce),
            gasPrice: web3.utils.toHex(20* 1e9),
            gasLimit: web3.utils.toHex(2000000),
            to: jotokenAddress,
            value: "0x0",
            data: JOToken.methods.transfer(to, web3.utils.toHex(HOUSE_ENTERANCE_REWARD)).encodeABI(),
            "chainId": 0x04
        };
        const tx = new Tx(rawTransaction);
        tx.sign(util.formattedAddress(relayerPrivKey));

        // send transaction
        return web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'))
    })
    .catch(err => {
        console.log('error: ', err);
        throw err;
    })
}