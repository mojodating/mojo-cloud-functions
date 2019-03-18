import {transferTokens} from './transferTokens'

export const handler = async (snapshot, context, db, web3) => {
    const transactionId = context.params.transactionId
    const data = snapshot.data()
    console.log(`new transactions ${transactionId} fromUid: ${data.fromUid} to ${data.toAddr}`)

    if(!(data.status === "waiting")) {
        return
    }

    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    await transferTokens(db, web3, {
        uid: data.fromUid,
        to: data.toAddr,
        value: data.value,
        jotokenAddress: jotokenAddress,
        relayer: relayer,
        relayerPrivKey: relayerPrivKey
    })

    await db.collection("transcations").doc(transactionId).update({
        status: "done"
    })
}
