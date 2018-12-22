import * as functions from 'firebase-functions';

let checkIfSent;

// Handler for sendFeedback function
// data - { userId: string, feedback: number }
// context - Firebase https.onCall Context
// db - database to use in function
export const handler = (data, context, db) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.userId === 'string') || data.userId.length === 0 || typeof data.feedback === 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'one arguments "userId" containing users id and "feedback" containing feedback id about the user.');
    }
    const fromUser = context.auth.uid;
    const toUser = data.userId;
    const feedback = data.feedback;

    const userRef = db.collection('users').doc(toUser);
    return db.runTransaction(t => t.get(userRef)
        .then(doc => checkIfSent(data, context, db)
            .then(() => {
                const docData = doc.data();
                const newFeedbackValue = (docData.feedback ? docData.feedback[feedback] : 0) + 1;
                return t.update(userRef, { 
                    ...docData,
                    feedback: {
                        ...docData.feedback,
                        [feedback]: newFeedbackValue,
                    },
                });
            })
            .catch(err => {
                console.error('err: ', err);
                throw new functions.https.HttpsError('failed-precondition', 'This user has already gave feedback about selected user.');
            })
        ).catch(err => {
            console.log('Transaction failure:', err);
            throw err;
        })
    ).then(result => {
        const feedbackRatingRef = db.collection('feedbackRating').doc(fromUser);
        return db.runTransaction(t => t.get(feedbackRatingRef)
            .then(doc => {
                if (doc.exists) {
                    const docData = doc.data();
                    if (docData.ratedUsers && docData.ratedUsers.filter(item => item.user === toUser).length > 0) {
                        return null;
                    }
                    const newRatedUsers = [
                        ...docData.ratedUsers,
                        { feedback, user: toUser },
                    ];
                    return t.update(feedbackRatingRef, { ratedUsers: newRatedUsers });
                }
                return feedbackRatingRef.set({ ratedUsers: [{ feedback, user: toUser }] });
            }));
    }).catch(err => {
        console.log('Transaction failure:', err);
        throw err;
    });
}

checkIfSent = (fromUser, toUser, db) => {
    return new Promise((resolve, reject) => {
        const feedbackRatingRef = db.collection('feedbackRating').doc(fromUser);
        feedbackRatingRef.get().then(doc => {
            if (doc.exists) {
                const alreadyRated = doc.data()
                    .ratedUsers
                    .filter(item => item.user === toUser)
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
