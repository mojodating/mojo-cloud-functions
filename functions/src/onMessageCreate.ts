
let acceptRequest

export const handler = (snapshot, context, db) => {
    const convId = context.params.conversationId
    const messageId = context.params.messageId
    console.log(`new message ${messageId} in conversation ${convId}`)

    const messageData = snapshot.val()
    const sender = messageData.sender

    const senderRef = db.collection('users').doc(sender)
    return senderRef.get()
        .then(doc => {
            const docData = doc.data();
            const receiver = docData.conversations[convId].sender
            if (receiver !== sender && docData.conversations[convId].accepted === false) {
                console.log('request is accepted')
                return acceptRequest(sender, receiver, convId, db)
            }
            
            console.log('it is not message which accepts request')
        })
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
        // TODO: transfer digital goods

}
