import * as functions from 'firebase-functions';
import * as util from './util';

let updateToUser;

// Handler for sendConversationRequest function
// data - { userId: string, text: string }
// context - Firebase https.onCall Context
// rtdb - realtime database to use in function
// db - firestore database to use in function
export const handler = (data, context, rtdb, db) => {

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.text === 'string' ||
        data.text.length === 0 ||
        typeof data.userId === 'string' ||
        data.userId.length === 0)) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'arguments userId" containing user UID and "text" containing message for this user.');
    }

    const fromUserId = context.auth.uid;
    const toUserId = data.userId;
    const message = {
        from: fromUserId,
        to: toUserId,
        text: data.text,
        date: new Date().getTime(),
    };
    const conversation = {
        from: fromUserId,
        to: toUserId,
        accepted: false,
    };
    const conversationId = util.guid();
    const fromUserRef = db.collection('users').doc(fromUserId);
    const toUserRef = db.collection('users').doc(toUserId);

    const batch = db.batch();
    return fromUserRef.get()
        .then(doc => {
            const docData = doc.data();
            if (docData.conversations && docData.conversations.filter(item => item.from === toUserId || item.to === toUserId).length > 0) {
                throw new functions.https.HttpsError('failed-precondition', 'The conversation between' +
                    'there users already exist.');
            }
            console.log('first write');
            return batch.update(fromUserRef, {
                conversations: { ...(docData.conversations ? docData.conversations : []), [conversationId]: conversation },
            });
        })
        .then(() => toUserRef.get()
            .then(doc => {
                console.log('second write');
                const docData = doc.data();
                return batch.update(toUserRef, {
                    conversations: { ...(docData.conversations ? docData.conversations : []), [conversationId]: conversation },
                });
            })
        )
        .then(() => batch.commit())
        .then(() => {
            const updates = {};
            updates[`conversations/${conversationId}`] = [message];
            return rtdb.ref().update(updates);
        });
};



// return db.runTransaction(t => t.get(usersRef)
//     .then(doc => {
//         const collectionData = doc.docs.map(item => item.data());
//         console.log(collectionData);
//         const fromUser = collectionData.filter(item => item.uid === fromUserId);
//         const toUser = collectionData.filter(item => item.uid === toUserId);
//         console.log('from: ', fromUser);
//         console.log('to: ', toUser);
//         if (fromUser.conversations && fromUser.conversations.filter(item => item.from === toUserId || item.to === toUserId).length > 0) {
//             throw new functions.https.HttpsError('failed-precondition', 'The conversation between' +
//                 'there users already exist.');
//         }
//         console.log('updating');
//         return t.update(usersRef, {
//             [fromUserId]: {
//                 ...fromUser,
//                 conversations: [...(fromUser.conversations ? fromUser.conversations : []), conversation],
//             },
//             [toUserId]: {
//                 ...toUser,
//                 conversations: [...(toUser.conversations ? toUser.conversations : []), conversation],
//             },
//         })
//             .then(() => {
//                 const updates = {};
//                 updates[`conversations/${conversationId}`] = [message];
//                 return rtdb.ref().update(updates);
//             });
//     })
// );
// }
