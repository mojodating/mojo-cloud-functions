import * as functions from 'firebase-functions'
import * as util from './util'
import { HOUSE_ENTERANCE_THRESHOLD, HOUSE_ENTERANCE_REWARD } from "./config";
const fs = require('fs')
const Tx = require('ethereumjs-tx')

let checkIfRated
let payHouseReward

// Handler for rate function
// data - { uid: string, rate: number }
// context - Firebase https.onCall Context
// db - database to use in function
export const handler = (data, context, db, web3) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.uid === 'string') || data.uid.length === 0 || !data.rate) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'two arguments: "uid" containing users uid and "rate" containing rating fot this user.');
    }

    const userRef = db.collection('users').doc(data.uid);
    return db.runTransaction(t => t.get(userRef)
        .then(doc => checkIfRated(data, context, db)
            .then(() => {
                const docData = doc.data();
                const newBouncingLineRating = (docData.bouncingLineRating ? docData.bouncingLineRating : 0) + data.rate;
                const newBouncingLineRatingCount = (docData.newBouncingLineRatingCount ? docData.newBouncingLineRatingCount : 0) + 1;
                if (newBouncingLineRating >= HOUSE_ENTERANCE_THRESHOLD) {
                    return t.update(userRef, {
                        bouncingLineRating: newBouncingLineRating,
                        bouncingLineRatingCount: newBouncingLineRatingCount,
                        insideHouse: true,
                    })
                    .then(payHouseReward(web3, doc.data().address))
                }
                return t.update(userRef, {
                    bouncingLineRating: newBouncingLineRating,
                    bouncingLineRatingCount: newBouncingLineRatingCount,
                });
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
                    if (docData.ratedUsers && docData.ratedUsers[data.uid]) {
                        return null;
                    }
                    const newRatedUsers = {
                        ...docData.ratedUsers,
                        [data.uid]: data.rate,
                    };
                    return t.update(bouncingLineRatingRef, { ratedUsers: newRatedUsers });
                }
                return bouncingLineRatingRef.set({ ratedUsers: {[data.uid]: data.rate} });
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
                    .ratedUsers[data.uid];
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
