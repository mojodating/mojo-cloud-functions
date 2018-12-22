import * as functions from 'firebase-functions';
const fs = require('fs')

// returns JoToken balance for address in wei
// data - {"address": "ethereum_address"} 
export const handler = async (data, web3) => {
    // read env variables
    const jotokenAddress = process.env.JOTOKEN_ADDRESS

    if(!web3.utils.isAddress(data.address)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid eth address')
    }

    // create JOToken instance
    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, jotokenAddress)

    try {
        const balance = await JOToken.methods.balanceOf(data.address).call()
        return {balance}
    }
    catch(error) {
        console.error('error: ', error)
        throw new functions.https.HttpsError('internal', error)
    }
}
