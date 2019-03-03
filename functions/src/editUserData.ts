import * as functions from 'firebase-functions';

/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Needs to be secured (data validation) on production stage !!!!!!!!!!!!!!!!!!*/
// Edits user data in database
// data to update 
// context - Firebase Context
// db - database to use in function
export const handler = (data, context, db) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    const batch = db.batch();
    const userRef = db.collection('users').doc(context.auth.uid);
    return userRef.get()
        .then(doc => {
            return batch.update(userRef, { 
                ...doc.data(),
                ...data,
            });
        })
        .then(() => batch.commit())
        .catch(err => {
            console.log('Transaction failure:', err);
            throw err;
        });;
}

