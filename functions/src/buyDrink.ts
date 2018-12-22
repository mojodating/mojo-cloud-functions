import * as functions from 'firebase-functions'
import {transferTokens} from './transferTokens'

// User buyes drink with JO tokens
// data - { typeid: string // drink type id }
// retruns - purchased drink details
export const handler = async (data, context, db, web3) => {
    if(!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'Signed out user call')
    }

    if(!(typeof data.typeid === 'string') || data.typeid === '') {
        throw new functions.https.HttpsError('invalid-argument', 'drink id shall be non empty string')
    }

    // read env variables
    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    try {
        // get drink price
        const drinkTypeDoc = await db.collection('drinkTypes').doc(data.typeid).get()
        const value = drinkTypeDoc.data().price * 1e18

        // pay for drink with JO tokens
        await transferTokens(db, web3, {
            uid: context.auth.uid,
            to: relayer,
            value: value,
            jotokenAddress: jotokenAddress,
            relayer: relayer,
            relayerPrivKey: relayerPrivKey
        })

        // assign drink to buyer
        const docRef = await db.collection("drinks").add({
            isSent: false,
            owner: context.auth.uid,
            sentTo: '',
            typeid: drinkTypeDoc.data().id
        })
        await docRef.update({id: docRef.id})

        // return purchased drink details
        const drinkDoc = await db.collection('drinks').doc(docRef.id).get()
        const result = drinkDoc.data()
        result.imageUrl = drinkTypeDoc.data().imageUrl
        result.name = drinkTypeDoc.data().name
        return result
    }
    catch(error) {
        console.error('error: ', error)
        throw new functions.https.HttpsError('internal', error)
    }
}
