import * as functions from 'firebase-functions';
import {transferTokens} from './transferTokens'

// Sends Jo tokens from user wallet to another address
// data - { to: string, value: number }
// returns - { data: string // transaction hash }
export const handler = async (data, context, db, web3) => {
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
    console.log(`send from uid: ${context.auth.uid} to addr: ${data.to} value: ${data.value}`)

    try {
        const receipt = await transferTokens(db, web3, {
            uid: context.auth.uid,
            to: data.to,
            value: data.value,
            jotokenAddress: jotokenAddress,
            relayer: relayer,
            relayerPrivKey: relayerPrivKey
        })

        const txRef = await db.collection("transactions").add({
            fromUid: context.auth.uid,
            toAddr: data.to,
            value: data.value/1e18,
            status: "done",
            type: "token transfer",
            date: new Date().getTime()/1000,
        })
        await txRef.update({id: txRef.id})

        return receipt.transactionHash
    }
    catch(error) {
        console.error('error: ', error)
        throw new functions.https.HttpsError('internal', error)
    }
}
