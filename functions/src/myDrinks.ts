import * as functions from 'firebase-functions'

// Retruns user drinks
// returns - { data: [ drink_objects ] }
export const handler = async (context, db) => {
    if(!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'Signed out user call')
    }

    try {
        const snapshot = await db.collection('drinkTypes').get()
        const drinkTypes = new Map
        snapshot.forEach(doc => {
            drinkTypes.set(doc.data().id, doc.data())
        });

        const drinkSnap = await db.collection('drinks').where('owner', '==', context.auth.uid).get()
        const drinks = []
        drinkSnap.forEach(doc => {
            const item = doc.data()
            item.name = drinkTypes.get(item.typeid).name
            item.imageUrl = drinkTypes.get(item.typeid).imageUrl
            drinks.push(item)
        });

        return drinks
    }
    catch(error) {
        console.error('error: ', error)
        throw new functions.https.HttpsError('internal', error)
    }
}
