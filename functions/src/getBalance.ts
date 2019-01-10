import * as functions from 'firebase-functions'
const fs = require('fs')

// returns JoToken balance for address in wei
// data - {"uid": string}
export const handler = async (data, db, web3) => {
    // read env variables
    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    console.log(`uid: ${data.uid}`)

    if (!(typeof data.uid === 'string') || data.uid.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
            'argument: "uid" containing users uid');
    }

    // create JOToken instance
    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, jotokenAddress)

    try {
        const snapshot = await db.collection('users').doc(data.uid).get()
        const address = snapshot.data().address
        const balance = await JOToken.methods.balanceOf(address).call()
        return {balance}
    }
    catch(error) {
        console.error('error: ', error)
        throw new functions.https.HttpsError('internal', error)
    }
}
