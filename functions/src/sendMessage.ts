import * as functions from 'firebase-functions';

let acceptRequest;

// Handler for sendMessage function
// data - { conversationId: string, userId: string, text: string }
// context - Firebase https.onCall Context
// rtdb - realtime database to use in function
// db - firestore database to use in function
export const handler = (data, context, rtdb, db) => {

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.conversationId === 'string' ||
        data.conversationId.length === 0 ||
        typeof data.text === 'string' ||
        data.text.length === 0 ||
        typeof data.userId === 'string' ||
        data.userId.length === 0)) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'arguments "conversationId" containing conversation UID, "userId" containing user UID and "text" containing message for this user.');
    }

    const fromUserId = context.auth.uid;
    const toUserId = data.userId;
    const conversationId = data.conversationId;
    const message = {
        from: fromUserId,
        to: toUserId,
        text: data.text,
        date: new Date().getTime(),
    };

    const conversationsRef = rtdb.ref(`conversations/${conversationId}`);
    return conversationsRef.once('value').then((result) => {
        const conversation = result.val();
        if (conversation) {
            if (conversation.length === 1 && conversation[0].from === fromUserId) {
                throw new functions.https.HttpsError('failed-precondition', 'The conversation must be accepted ' +
                    'by other user to send new messages.');
            }
            if (conversation.length === 1 && conversation[0].from === toUserId) {
                return acceptRequest(fromUserId, toUserId, conversationId, db)
                    .then(() => {
                        const updatesAccepted = {};
                        updatesAccepted[`conversations/${conversationId}`] = [...conversation, message];
                        return rtdb.ref().update(updatesAccepted);
                    });
            }
            const updates = {};
            updates[`conversations/${conversationId}`] = [...conversation, message];
            return rtdb.ref().update(updates);
        } else {
            console.error('Converstation not exists.');
            return null;
        }
    });
}

acceptRequest = (fromUserId, toUserId, conversationId, db) => {
    const fromUserRef = db.collection('users').doc(fromUserId);
    const toUserRef = db.collection('users').doc(toUserId);
    const batch = db.batch()

    return fromUserRef.get()
        .then(doc => {
            const docData = doc.data();
            return batch.update(fromUserRef, {
                conversations: { 
                    ...docData.conversations,
                    [conversationId]: {
                        ...docData.conversations[conversationId],
                    accepted: true,
                    } 
                },
            });
        })
        .then(() => toUserRef.get()
            .then(doc => {
                const docData = doc.data();
                return batch.update(toUserRef, {
                    conversations: { 
                        ...docData.conversations,
                        [conversationId]: {
                            ...docData.conversations[conversationId],
                        accepted: true,
                        } 
                    },
                });
            })
        )
        .then(() => batch.commit());
}
