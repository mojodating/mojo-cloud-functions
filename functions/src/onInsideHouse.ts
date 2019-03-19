import * as util from './util'
import { HOUSE_ENTERANCE_REWARD } from "./config";
const fs = require('fs')
const Tx = require('ethereumjs-tx')

let payHouseReward

// Handler checks if new user enters mojo house
// for every new user it payes reward in Jo tokens
// and sends notification to device
export const handler = async (messaging, web3, db, change) => {
    console.log('Function triggered by user change');
    const newValue = change.after.data();
    const previousValue = change.before.data();

    if (newValue.insideHouse !== previousValue.insideHouse && newValue.insideHouse === true) {
        console.log('New user enters the house, pay reward and send notification')
        const token = newValue.token
        const address = newValue.address
        console.log(`user token: ${token}, user address: ${address}`)

        const payload = {
            notification: {
                title: "High rating reward",
                body: "Congratulations you get a reward for high rating!"
            }
        }

        const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
        const parsedSource = JSON.parse(source)
        const JOToken = new web3.eth.Contract(parsedSource.abi, '0xfEc08bb2439bf6Bb207480F78B9db5C0b6aa50cE')

        try {
            await payHouseReward(web3, address)

            const txRef = await db.collection("transactions").add({
                fromUid: "mojo-app",
                toAddr: address,
                value: HOUSE_ENTERANCE_REWARD/1e18,
                status: "done",
                type: "reward",
                date: new Date().getTime()/1000
            })
            await txRef.update({id: txRef.id})

            // print balance, to check if reward was paid properly
            const weiBalance = await JOToken.methods.balanceOf(address).call()
            const balance = Number(web3.utils.fromWei(weiBalance, 'ether'))
            console.log(`balance: ${balance}`) 

            // send notification to device
            const response = await messaging.sendToDevice(token, payload)
            console.log(`message: ${payload.notification.body} to token: ${token}`)
            console.log("Successfully sent message:", response);
        }
        catch(error) {
            console.error("Error:", error);
        }
    }

    return null
}

payHouseReward = (web3, to) => {
    console.log('payHouseReward')

    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    // create JOToken instance
    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, jotokenAddress)

    return web3.eth.getTransactionCount(relayer)
    .then(relayerNonce => {
        // create raw transaction and sign it by relayer
        const rawTransaction = {
            from: relayer,
            nonce: web3.utils.toHex(relayerNonce),
            gasPrice: web3.utils.toHex(20* 1e9),
            gasLimit: web3.utils.toHex(2000000),
            to: jotokenAddress,
            value: "0x0",
            data: JOToken.methods.transfer(to, web3.utils.toHex(HOUSE_ENTERANCE_REWARD)).encodeABI(),
            "chainId": 0x04
        };
        const tx = new Tx(rawTransaction);
        tx.sign(util.formattedAddress(relayerPrivKey));

        // send transaction
        return web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'))
    })
    .catch(err => {
        console.log('error: ', err);
        throw err;
    })
}
