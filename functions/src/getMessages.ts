import * as functions from 'firebase-functions';

// Handler for getMessages function
// data - { conversationId: string }
// context - Firebase https.onCall Context
// rtdb - realtime database to use in function
export const handler = (data, context, rtdb) => {

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.conversationId === 'string') || data.conversationId.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'arguments "conversationId" containing conversation UID.');
    }

    const fromUserId = context.auth.uid;
    const conversationId = data.conversationId;

    const messagesRef = rtdb.ref(`conversations/${conversationId}`);
    return messagesRef.once('value').then(result => {
        const messages = result.val();
        if (messages && messages[0].from === fromUserId || messages[0].to === fromUserId) {
            return messages;
        }
        throw new functions.https.HttpsError('failed-precondition', 'Such conversation does not exist.');
    });
}
