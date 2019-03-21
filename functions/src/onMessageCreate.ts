import * as util from './util'

let acceptRequest

export const handler = (snapshot, context, db, messaging) => {
    const convId = context.params.conversationId
    const messageId = context.params.messageId
    console.log(`new message ${messageId} in conversation ${convId}`)

    const messageData = snapshot.data()
    const sender = messageData.sender
    const receiver = messageData.receiver

    const senderRef = db.collection('users').doc(sender)
    const receiverRef = db.collection('users').doc(receiver)
    let fromUserData

        // add id to every message
    return db.collection('conversations').doc(convId).collection('messages').doc(snapshot.id).update({id: snapshot.id})
        .then(() => senderRef.get())
        // check if message accepts request if yes update database and send drink
        .then(doc => {
            fromUserData = doc.data();
            const requestSender = fromUserData.conversations[convId].sender
            if (requestSender !== sender && fromUserData.conversations[convId].accepted === false) {
                console.log('request is accepted')
                return acceptRequest(sender, receiver, convId, db)
            }
            
            console.log('it is not message which accepts request')
        })
        
        // send notification message
        .then(() => receiverRef.get()
            .then(doc => {
                const payload = {
                    notification: {
                        title: 'New message from ' + fromUserData.fullname,
                        from: sender,
                        body: util.truncateMessage(messageData.text),
                        badge: '1',
                        conversationId: convId,
                    }
                }
                // for first message do not send message
                if (messageData.drinkId === undefined) {
                    const toUserData = doc.data();
                    console.log(`message: ${messageData.text} to token: ${toUserData.token}`)
                    return messaging.sendToDevice(toUserData.token, payload)
                }
            })
        )
        .then(function(response) {
            console.log("Successfully sent message:", response);
        })
        .catch(function(error) {
            console.error("Error sending message:", error);
        })
}

acceptRequest = (fromUserId, toUserId, conversationId, db) => {
    const fromUserRef = db.collection('users').doc(fromUserId);
    const toUserRef = db.collection('users').doc(toUserId);
    let drinkid
    const batch = db.batch()

    return fromUserRef.get()
        .then(doc => {
            const docData = doc.data();
            drinkid = docData.conversations[conversationId].drinkId
            console.log(`drinkid: ${drinkid}`)
            return batch.update(fromUserRef, {
                conversations: { 
                    ...docData.conversations,
                    [conversationId]: {
                        ...docData.conversations[conversationId],
                    accepted: true,
                    seen: true,
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
                        seen: true,
                        } 
                    },
                });
            })
        )
        .then(() => db.collection('drinks').doc(drinkid).get())
        .then(doc => {
            const docData = doc.data()
            return batch.update(db.collection('drinks').doc(drinkid), {
                owner: docData.sentTo,
                sentTo: "",
                blocked: false,
            })
        })
        .then(() => batch.commit())
        .catch(err => {
            console.log('error: ', err);
            throw err;
        })
}
