import * as functions from 'firebase-functions';
import * as sendJoTokens from './sendJoTokens';

/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Needs to be secured (data validation) on production stage !!!!!!!!!!!!!!!!!!*/
// Edits user data in database
// data to update 
// context - Firebase Context
// db - database to use in function
export const handler = (data, context, db, web3) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    const batch = db.batch();
    const userRef = db.collection('users').doc(context.auth.uid);
    return userRef.get()
        .then(doc => {
            const newUser = doc.data();
            if (data.invitedBy && !newUser.invitedBy) {
                sendJoTokens.handler({ to: newUser.address, value: 10, }, context, db, web3)
                    .then(() => console.log('newUser got the tokens'))
                    .catch(() => console.error('newUser couldnt get the tokens'));
                // Send 10 Jo tokens to inviter
                db.collection("users").where("invitationCode", "==", data.invitedBy)
                    .get()
                    .then(querySnapshot => querySnapshot
                        .map(docInvitedBy => {
                            sendJoTokens.handler({ to: docInvitedBy.data().address, value: 10, }, context, db, web3)
                                .then(() => console.log('inviter got the tokens'))
                                .catch(() => console.error('inviter couldnt get the tokens'));;
                        })
                    )
                    .catch(function (error) {
                        console.log("Error getting documents: ", error);
                    });
            }
            return batch.update(userRef, {
                ...newUser,
                ...data,
                invitedBy: newUser.invitedBy ? newUser.invitedBy : //Prevent user from overwriting this field if already set
                    (data.invitedBy ? data.invitedBy : 'none'),
            });
        })
        .then(() => batch.commit())
        .catch(err => {
            console.log('Transaction failure:', err);
            throw err;
        });;
}

