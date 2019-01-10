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

    const fromUid = context.auth.uid;
    const toUid = data.uid;
    const invitationId = util.guid();
    const fromUserRef = db.collection('users').doc(fromUid)
    const toUserRef = db.collection('users').doc(toUid)
    let drinkid

    // read env variables
    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY
    const batch = db.batch()
        // buy drink and send
    return buyDrinkFor(db, web3, {
            uid: fromUid,
            receiver: toUid,
            drinktypeid: data.drinktypeid,
            jotokenAddress: jotokenAddress,
            relayer: relayer,
            relayerPrivKey: relayerPrivKey
        })
        .then(drink => {
            drinkid = drink
            return fromUserRef.get()
        })
        // add invitation to sender database
        .then(doc => {
            const docData = doc.data();
            if (docData.requests && docData.requests.filter(item => item.to === toUid).length > 0) {
                throw new functions.https.HttpsError('failed-precondition', 'The conversation between' +
                    'there users already exist.');
            }
            return batch.update(fromUserRef, {
                requests: { ...(docData.requests ? docData.requests : []), [invitationId]: {
                    to: toUid,
                    type: 'sent',
                    text: data.text, 
                    drinkid: drinkid
                } },
            });
        })
        // add invitation to receiver database
        .then(() => toUserRef.get()
            .then(doc => {
                const docData = doc.data();
                return batch.update(toUserRef, {
                    requests: { ...(docData.requests ? docData.requests : []), [invitationId]: {
                        from: fromUid,
                        type: 'received',
                        text: data.text,
                        drinkid: drinkid
                    } },
                });
            })
        )
        .then(() => batch.commit())
        .catch(error => {
            console.error('error: ', error)
            throw new functions.https.HttpsError('internal', error)
        })
};
