import * as functions from 'firebase-functions';

// Handler for getOpenedConversations function
// data - {} (optional)
// context - Firebase https.onCall Context
// db - firestore database to use in function
export const handler = (data, context, db) => {

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    const fromUserId = context.auth.uid;

    const userRef = db.collection('users').doc(fromUserId);
    return db.runTransaction(t => t.get(userRef)
        .then(doc => {
            const docData = doc.data();
            return docData.conversations ? docData.conversations : [];
        }),
    );
}
