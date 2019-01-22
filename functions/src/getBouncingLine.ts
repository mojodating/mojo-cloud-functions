import * as functions from 'firebase-functions';

// Handler for getBouncingLine function
// data - {} (optional)
// context - Firebase https.onCall Context
// db - firestore database to use in function
export const handler = (data, context, db) => {

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }

    db.collection("users").where("insideHouse", "==", false)
        .get()
        .then((querySnapshot) => {
            return querySnapshot
                .map(doc => doc.data())
                .sort((a, b) => {
                    if (a.fullname < b.fullname) { return -1; }
                    if (a.fullname > b.fullname) { return 1; }
                    return 0;
                });
        })
        .catch(function (error) {
            console.log("Error getting documents: ", error);
        });
}
