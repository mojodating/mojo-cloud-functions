import * as functions from 'firebase-functions'
import { RELAYER_ADDRESS } from './config'

// User buyes drink with JO tokens for other address as gift, gift has to be accepted
// data - {uid: string,
//         receiver:  string  - recipient address,
//         drinktypeid: string - drinktype id}
// retruns - purchased drink id
export const buyDrinkFor = async (db, data) => {

    if(!(typeof data.drinktypeid === 'string') || data.drinktypeid === '') {
        throw new functions.https.HttpsError('invalid-argument', 'drink id shall be non empty string')
    }

    try {
        // get drink price
        const drinkTypeDoc = await db.collection('drinkTypes').doc(data.drinktypeid).get()
        const value = drinkTypeDoc.data().price * 1e18

        // postponed payment for drink with JO tokens - below code only puts to transactions collection
        // every waiting transaction in transactions collection will be executed by additinal cloud function ("onTransaction")
        // This mechanism was created to not block http request with token transfer
        const txRef = await db.collection("transactions").add({
            fromUid: data.uid,
            toAddr: RELAYER_ADDRESS,
            value: value/1e18,
            status: "waiting",
            type: "drink payment",
            date: new Date().getTime()/1000
        })
        await txRef.update({id: txRef.id})

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
