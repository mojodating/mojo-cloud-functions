import * as functions from 'firebase-functions';
import * as util from './util'
const fs = require('fs')
const Tx = require('ethereumjs-tx')
const ethutil = require('ethereumjs-util') 

// Sends Jo tokens from user wallet to another address
// This function will prepare message and sign it with user(sender) private key
// then message will be send to JOToken contract by relayer. Relayer will
// pay the transaction fee.
// data - {"to": "recipient_address", "value": sent_amount_of_wei}
export const handler = (data, context, db, web3) => {
    if(!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'Signed out user call')
    }

    if(!web3.utils.isAddress(data.to)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid recipient address')
    }

    if(!(typeof data.value === 'number') || data.value <= 0) {
       throw new functions.https.HttpsError('invalid-argument', 'Sent value shall be positive number') 
    }

    // read env variables
    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    // create JOToken instance
    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, jotokenAddress)

    let senderPrivKey, senderNonce

    // get user(sender) private key and nonce
    // increase nonce
    return db.doc(`users/${context.auth.uid}`).get()
    .then(snapshot => {
        senderPrivKey = snapshot.data().privateKey
        senderNonce = snapshot.data().nonce + 1
        return snapshot.ref.update({nonce: senderNonce})
    })
    .then(() => {
        return web3.eth.getTransactionCount(relayer)
    })
    .then(relayerNonce => {
        // prepare JOToken transfer message and sign it with sender private key
        const components = [
            Buffer.from('48664c16', 'hex'),
            util.formattedAddress(jotokenAddress),
            util.formattedAddress(data.to),
            util.formattedInt(data.value),
            util.formattedInt(0),
            util.formattedInt(senderNonce)
        ];
        const vrs = ethutil.ecsign(util.hashedTightPacked(components), util.formattedAddress(senderPrivKey));
        const sig = ethutil.toRpcSig(vrs.v, vrs.r, vrs.s);

        // create raw transaction and sign it by relayer
        const rawTransaction = {
            "from": relayer,
            "nonce": web3.utils.toHex(relayerNonce),
            "gasPrice": web3.utils.toHex(20* 1e9),
            "gasLimit": web3.utils.toHex(2000000),
            "to": jotokenAddress,
            "value": "0x0",
            "data": JOToken.methods.transferPreSigned(sig, data.to, web3.utils.toHex(data.value), '0x0'
                , web3.utils.toHex(senderNonce)).encodeABI(),
            "chainId": 0x04
        };
        const tx = new Tx(rawTransaction);
        tx.sign(util.formattedAddress(relayerPrivKey));
    
        // send transaction
        return web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'))
    })
    .then(receipt => {
        return receipt.transactionHash
    })
    .catch(err => {
        console.log('error: ', err);
        throw err;
    })
}
