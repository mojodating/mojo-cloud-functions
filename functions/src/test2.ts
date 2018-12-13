import * as functions from 'firebase-functions'
import * as Web3 from 'web3'
import * as admin from 'firebase-admin'
import { WEB3_PROVIDER_ADDRESS } from "./config"
const fs = require("fs")
const Tx = require('ethereumjs-tx');
const ethutil = require('ethereumjs-util'); 

admin.initializeApp()

const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER_ADDRESS))
const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
const parsed = JSON.parse(source)

const jotokenAddress = '0xfEc08bb2439bf6Bb207480F78B9db5C0b6aa50cE'
const relayer = '0x5D539e1b7CF560D0631fC0A74aBFB6292344D401'
const relayerPrivKey = Buffer.from('1A5A9C014010C0E0D15AC37B7F8BB8C31768E670F9930D4D41EE362733C06C55', 'hex')
const sender = '0x041c14d0eDbd8122b937A031D150099A8134DE4C'
const senderPrivKey = Buffer.from('4367af8b1a4632bd255b565f4a6de6e5ec5aee989a14b0b735577036f9f7301d', 'hex');
const JOToken = new web3.eth.Contract(parsed.abi, jotokenAddress)

let nonceSender

const formattedAddress = (address) => {
    return  Buffer.from(ethutil.stripHexPrefix(address), 'hex');
};

const formattedInt = (int) => {
    return ethutil.setLengthLeft(int, 32);
};

const hashedTightPacked = (args) => {
    return ethutil.sha3(Buffer.concat(args));
};

web3.eth.getTransactionCount(sender)
.then( nonce => {
    nonceSender = nonce
    return web3.eth.getTransactionCount(relayer)
})
.then( nonceRelayer => {

    // make variables, then it will be much easier (we have sender, relayer)
    const components = [
        Buffer.from('48664c16', 'hex'),
        formattedAddress(jotokenAddress),
        formattedAddress(relayer),
        formattedInt(100),
        formattedInt(0),
        formattedInt(nonceSender)
      ];
      const vrs = ethutil.ecsign(hashedTightPacked(components), senderPrivKey);
      const sig = ethutil.toRpcSig(vrs.v, vrs.r, vrs.s);

    let rawTransaction = {
        "from": relayer,
        "nonce": web3.utils.toHex(nonceRelayer),
        "gasPrice": web3.utils.toHex(20* 1e9),
        "gasLimit": web3.utils.toHex(2000000),
        "to": jotokenAddress,
        "value": "0x0",
        "data": JOToken.methods.transferPreSigned(sig, relayer, web3.utils.toHex(100), '0x0', web3.utils.toHex(nonceSender)).encodeABI(),
        "chainId": 0x04
    };
    const tx = new Tx(rawTransaction);
    tx.sign(relayerPrivKey);
  
    web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'))
            .on('transactionHash', console.log);
})
.catch(err => {
    console.log('error: ', err);
});