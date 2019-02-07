
let acceptRequest

export const handler = (snapshot, context, db) => {
    const convId = context.params.conversationId
    const messageId = context.params.messageId
    console.log(`new message ${messageId} in conversation ${convId}`)

    const messageData = snapshot.data()
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
