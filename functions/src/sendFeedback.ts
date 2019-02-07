import * as functions from 'firebase-functions';

let checkIfSent;

// Handler for sendFeedback function
// data - { uid: string, feedback: string }
// context - Firebase https.onCall Context
// db - database to use in function
export const handler = (data, context, db) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.uid === 'string') || data.uid.length === 0 || !(typeof data.feedback === 'string')) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'one arguments "uid" containing users id and "feedback" containing feedback about the user.');
    }
    const fromUser = context.auth.uid;
    const toUser = data.uid;
    // const feedback = data.feedback;

    const batch = db.batch()
    const userRef = db.collection('users').doc(toUser);
    return userRef.get()
        .then(doc => checkIfSent(fromUser, toUser, db)
            .then(() => {
                const docData = doc.data();
                const newFeedbackValue = (docData.feedback ? docData.feedback[data.feedback] : 0) + 1;
                return batch.update(userRef, { 
                    feedback: {
                        ...docData.feedback,
                        [data.feedback]: newFeedbackValue,
                    },
                });
            })
            .catch(err => {
                console.error('err: ', err);
                throw new functions.https.HttpsError('failed-precondition', 'This user has already gave feedback about selected user.');
            })
        )
        .then(result => {
            const feedbackRatingRef = db.collection('feedbackRating').doc(fromUser);
            return feedbackRatingRef.get()
                .then(doc => {
                    if (doc.exists) {
                        const docData = doc.data();
                        if (docData.ratedUsers && docData.ratedUsers.filter(item => item.user === toUser).length > 0) {
                            return null;
                        }
                        const newRatedUsers = [
                            ...docData.ratedUsers,
                            { feedback: data.feedback, user: toUser },
                        ];
                        return batch.update(feedbackRatingRef, { ratedUsers: newRatedUsers });
                    }
                    return feedbackRatingRef.set({ ratedUsers: [{ feedback: data.feedback, user: toUser }] });
                })
            })
        .then(() => batch.commit())
        .catch(err => {
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
