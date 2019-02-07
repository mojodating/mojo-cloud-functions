import * as functions from 'firebase-functions'
import { HOUSE_ENTERANCE_THRESHOLD } from "./config";

let checkIfRated

// Handler for rate function
// data - { uid: string, rate: number }
// context - Firebase https.onCall Context
// db - database to use in function
export const handler = (data, context, db) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.uid === 'string') || data.uid.length === 0 || !data.rate) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'two arguments: "uid" containing users uid and "rate" containing rating fot this user.');
    }
    
    const batch = db.batch()
    const userRef = db.collection('users').doc(data.uid);
    return userRef.get()
        .then(doc => checkIfRated(data, context, db)
            .then(() => {
                console.log(`Update bouncing line rate for user: ${data.uid} rate: ${data.rate}`)
                const docData = doc.data();
                const newBouncingLineRating = (docData.bouncingLineRating ? docData.bouncingLineRating : 0) + data.rate;
                const newBouncingLineRatingCount = (docData.bouncingLineRatingCount ? docData.bouncingLineRatingCount : 0) + 1;
                if (newBouncingLineRating >= HOUSE_ENTERANCE_THRESHOLD) {
                    return batch.update(userRef, {
                        bouncingLineRating: newBouncingLineRating,
                        bouncingLineRatingCount: newBouncingLineRatingCount,
                        insideHouse: true,
                    })
                }
                return batch.update(userRef, {
                    bouncingLineRating: newBouncingLineRating,
                    bouncingLineRatingCount: newBouncingLineRatingCount,
                });
            })
            .catch(err => {
                console.error('err: ', err);
                throw new functions.https.HttpsError('failed-precondition', 'This user has already been rated');
            })
        )
        .then(result => {
            const bouncingLineRatingRef = db.collection('bouncingLineRating').doc(context.auth.uid);
            return bouncingLineRatingRef.get()
            .then(doc => {
                if (doc.exists) {
                    const docData = doc.data();
                    if (docData.ratedUsers && docData.ratedUsers[data.uid]) {
                        return null;
                    }
                    const newRatedUsers = {
                        ...docData.ratedUsers,
                        [data.uid]: data.rate,
                    };
                    return batch.update(bouncingLineRatingRef, { ratedUsers: newRatedUsers });
                }
                return bouncingLineRatingRef.set({ ratedUsers: {[data.uid]: data.rate} });
            });
        })
        .then(() => batch.commit())
        .catch(err => {
            console.log('Transaction failure:', err);
            throw err;
        });
}

checkIfRated = (data, context, db) => {
    return new Promise((resolve, reject) => {
        const bouncingLineRatingRef = db.collection('bouncingLineRating').doc(context.auth.uid);
        bouncingLineRatingRef.get().then(doc => {
            console.log(`doc exist for user: ${context.auth.uid}: ${doc.exists}`)
            if (doc.exists) {
                const alreadyRated = doc.data()
                    .ratedUsers[data.uid];
                console.log(`already rated: ${alreadyRated}`)
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
