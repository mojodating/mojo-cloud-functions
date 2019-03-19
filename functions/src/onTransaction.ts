import {transferTokens} from './transferTokens'

// Function is triggered on every new transaction in transactions collection
// It checkes if transaction status is waiting, if yes it 
// executes transaction and update status to done
export const handler = async (snapshot, context, db, web3) => {
    const transactionId = context.params.transactionId
    const data = snapshot.data()
    console.log(`new transactions ${transactionId} fromUid: ${data.fromUid} to ${data.toAddr}`)

    if(data.status !== "waiting") {
        return
    }

    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    console.log('execute transaction')
    await transferTokens(db, web3, {
        uid: data.fromUid,
        to: data.toAddr,
        value: data.value,
        jotokenAddress: jotokenAddress,
        relayer: relayer,
        relayerPrivKey: relayerPrivKey
    })

    await db.collection("transactions").doc(transactionId).update({
        status: "done"
    })
}
