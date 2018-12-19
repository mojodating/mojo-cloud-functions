import * as functions from 'firebase-functions';
import { HOUSE_ENTERANCE_THRESHOLD } from "./config";

let checkIfRated;

// Handler for rateUp function
// data - { uid: string }
// context - Firebase https.onCall Context
// db - database to use in function
export const handler = (data, context, db) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.uid === 'string') || data.uid.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'one arguments "text" containing the message text to add.');
    }

    const userRef = db.collection('users').doc(data.uid);
    return db.runTransaction(t => t.get(userRef)
        .then(doc => checkIfRated(data, context, db)
            .then(() => {
                const newBouncingLineRating = (doc.data().bouncingLineRating ? doc.data().bouncingLineRating : 0) + 1;
                if (newBouncingLineRating >= HOUSE_ENTERANCE_THRESHOLD) {
                    return t.update(userRef, { bouncingLineRating: newBouncingLineRating, insideHouse: true });
                }
                return t.update(userRef, { bouncingLineRating: newBouncingLineRating });
            })
            .catch(err => {
                console.error('err: ', err);
                throw new functions.https.HttpsError('failed-precondition', 'This user has already been rated');
            })
        ).catch(err => {
            console.log('Transaction failure:', err);
            throw err;
        })
    ).then(result => {
        const bouncingLineRatingRef = db.collection('bouncingLineRating').doc(context.auth.uid);
        return db.runTransaction(t => t.get(bouncingLineRatingRef)
            .then(doc => {
                if (doc.exists) {
                    const docData = doc.data();
                    if (docData.ratedUsers && docData.ratedUsers.filter(item => item === data.uid).length > 0) {
                        return null;
                    }
                    const newRatedUsers = [
                        ...docData.ratedUsers,
                        data.uid
                    ];
                    return t.update(bouncingLineRatingRef, { ratedUsers: newRatedUsers });
                }
                return bouncingLineRatingRef.set({ ratedUsers: [data.uid] });
            }));
    }).catch(err => {
        console.log('Transaction failure:', err);
        throw err;
    });
}

checkIfRated = (data, context, db) => {
    return new Promise((resolve, reject) => {
        const bouncingLineRatingRef = db.collection('bouncingLineRating').doc(context.auth.uid);
        bouncingLineRatingRef.get().then(doc => {
            if (doc.exists) {
                const alreadyRated = doc.data()
                    .ratedUsers
                    .filter(item => item === data.uid)
                    .length > 0;
                if (alreadyRated) {
                    reject();
                } else {
                    resolve();
                }
            } else {
                resolve();
            }
        });
    });
}
