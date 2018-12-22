import * as functions from 'firebase-functions';

// returns list of drink types
export const handler = async (db) => {
    try {
        const snapshot = await db.collection('drinkTypes').get()
        const drinkTypes = []
        snapshot.forEach(doc => {
            drinkTypes.push(doc.data())
        });

        return drinkTypes
    }
    catch(error) {
        console.error('error: ', error)
        throw new functions.https.HttpsError('internal', error)
    }
}
