import * as functions from 'firebase-functions'
import {transferTokens} from './transferTokens'

// User buyes drink with JO tokens for other address as gift, gift has to be accepted
// data - {uid: string,
//         receiver:  string  - recipient address,
//         drinktypeid: string - drinktype id
//         jotokenAddress: string - token address
//         relayer: string - address which will pay for transaction
//         relayerPrivKey: string}
// retruns - purchased drink id
export const buyDrinkFor = async (db, web3, data) => {

    if(!(typeof data.drinktypeid === 'string') || data.drinktypeid === '') {
        throw new functions.https.HttpsError('invalid-argument', 'drink id shall be non empty string')
    }

    try {
        // get drink price
        const drinkTypeDoc = await db.collection('drinkTypes').doc(data.drinktypeid).get()
        const value = drinkTypeDoc.data().price * 1e18

        // pay for drink with JO tokens
        await transferTokens(db, web3, {
            uid: data.uid,
            to: data.relayer,
            value: value,
            jotokenAddress: data.jotokenAddress,
            relayer: data.relayer,
            relayerPrivKey: data.relayerPrivKey
        })

        // assign drink to receiver, drink is blocked until
        // receiver will accept gift
        const docRef = await db.collection("drinks").add({
            blocked: true,
            owner: data.uid,
            sentTo: data.receiver,
            typeid: drinkTypeDoc.data().id,
            imageUrl: drinkTypeDoc.data().imageUrl,
            name: drinkTypeDoc.data().name
        })
        const did = docRef.id
        await docRef.update({id: docRef.id})

        return {id: did, price: drinkTypeDoc.data().price, imageUrl: drinkTypeDoc.data().imageUrl, name: drinkTypeDoc.data().name}
    }
    catch(error) {
        console.error('error: ', error)
        throw new functions.https.HttpsError('internal', error)
    }
}
