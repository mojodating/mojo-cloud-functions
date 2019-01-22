import * as functions from 'firebase-functions'
import * as util from './util'
import {buyDrinkFor} from './buyDrinkFor'

// Handler for sendConversationRequest function
// data - { uid: string, text: string, drinktypeid: string }
// context - Firebase https.onCall Context
// rtdb - realtime database to use in function
// db - firestore database to use in function
export const handler = (data, context, db, web3) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    if (!(typeof data.text === 'string' || data.text.length === 0 ||
        typeof data.uid === 'string' || data.uid.length === 0 || 
        typeof data.drinktypeid === 'string' || data.drinktypeid.length === 0)) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'arguments userId" containing user UID and "text" containing message for this user.');
    }

    console.log(data)
    const fromUid = context.auth.uid;
    const toUid = data.uid;
    const conversationId = util.guid();
    const fromUserRef = db.collection('users').doc(fromUid)
    const toUserRef = db.collection('users').doc(toUid)
    let drink
    let docData

    // read env variables
    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY
    const batch = db.batch()
        // buy drink and send
    return fromUserRef.get()
        .then(doc => {
            docData = doc.data()
            console.log(docData.conversations)
            if (docData.conversations) {
                Object.keys(docData.conversations).forEach(function(key) {
                    if (docData.conversations[key].receiver === toUid) {
                        throw new functions.https.HttpsError('failed-precondition', 'The conversation between ' +
                            'these users already exist.');
                    }
                })
            }
            return buyDrinkFor(db, web3, {
                uid: fromUid,
                receiver: toUid,
                drinktypeid: data.drinktypeid,
                jotokenAddress: jotokenAddress,
                relayer: relayer,
                relayerPrivKey: relayerPrivKey
            })
        })
        // add invitation to sender database
        .then(boughtDrink => {
            drink = boughtDrink
            console.log(drink)
            return batch.update(fromUserRef, {
                conversations: { ...(docData.conversations ? docData.conversations : []), [conversationId]: {
                    id: conversationId,
                    sender: fromUid,
                    receiver: toUid,
                    accepted: false,
                    text: data.text, 
                    drinkPrice: drink.price,
                    drinkImage: drink.imageUrl,
                    drinkName: drink.name
                } },
            });
        })
        // add invitation to receiver database
        .then(() => toUserRef.get()
            .then(doc => {
                const toUserDoc = doc.data();
                return batch.update(toUserRef, {
                    conversations: { ...(toUserDoc.conversations ? toUserDoc.conversations : []), [conversationId]: {
                        id: conversationId,
                        sender: fromUid,
                        receiver: toUid,
                        accepted: false,
                        text: data.text,
                        drinkPrice: drink.price,
                        drinkImage: drink.imageUrl,
                        drinkName: drink.name
                    } },
                });
            })
        )
        .then(() => {
            const message = {
                sender: fromUid,
                receiver: toUid,
                text: data.text,
                date: new Date().getTime(),
            };

            let newMessageDoc = db.collection(`conversations/${conversationId}/messages`).doc()
            return batch.set(newMessageDoc, message)
        })
        .then(() => batch.commit())
        .catch(error => {
            console.error('error: ', error)
            throw new functions.https.HttpsError('internal', error)
        })
};
