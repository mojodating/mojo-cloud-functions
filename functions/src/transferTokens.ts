import * as util from './util'
const Tx = require('ethereumjs-tx')
const ethutil = require('ethereumjs-util') 
const fs = require('fs')

// Transfer Jo tokens from user wallet to another address
// This function will prepare message and sign it with user(sender) private key
// then message will be send to JOToken contract by relayer. Relayer will
// pay the transaction fee.
// data - {uid: number,
//         to:  string // recipient address,
//         value: number // sent amount of wei
//         jotokenAddress: string // token address
//         relayer: string // address which will pay for transaction
//         relayerPrivKey: string}
//
// returns - { data: { json_object_with_tx_receipt } }
export const transferTokens = async (db, web3, data) => {
    // create JOToken instance
    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, data.jotokenAddress)

    try {
        const userDoc = await db.doc(`users/${data.uid}`).get()
        const senderPrivKey = userDoc.data().privateKey
        const senderNonce = userDoc.data().nonce + 1
        await userDoc.ref.update({nonce: senderNonce})

        // prepare JOToken transfer message and sign it with sender private key
        const components = [
            Buffer.from('48664c16', 'hex'),
            util.formattedAddress(data.jotokenAddress),
            util.formattedAddress(data.to),
            util.formattedInt(data.value),
            util.formattedInt(0),
            util.formattedInt(senderNonce)
        ];
        const vrs = ethutil.ecsign(util.hashedTightPacked(components), util.formattedAddress(senderPrivKey));
        const sig = ethutil.toRpcSig(vrs.v, vrs.r, vrs.s);

        const relayerNonce = await web3.eth.getTransactionCount(data.relayer)
        // create raw transaction and sign it by relayer
        const rawTransaction = {
            from: data.relayer,
            nonce: web3.utils.toHex(relayerNonce),
            gasPrice: web3.utils.toHex(20* 1e9),
            gasLimit: web3.utils.toHex(2000000),
            to: data.jotokenAddress,
            value: "0x0",
            data: JOToken.methods.transferPreSigned(sig, data.to, web3.utils.toHex(data.value), '0x0'
                , web3.utils.toHex(senderNonce)).encodeABI(),
            "chainId": 0x04
        };
        const tx = new Tx(rawTransaction);
        tx.sign(util.formattedAddress(data.relayerPrivKey));

        // send transaction
        const receipt = await web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'))
        return receipt
    }
    catch(error) {
        console.error('transferTokens failed: ', error)
        throw error
    }
}