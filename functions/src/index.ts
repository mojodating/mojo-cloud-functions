import * as functions from 'firebase-functions';
import * as Web3 from "web3"

// set infura provider for web3
const web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/308ae1b2d2e64958843a69cdc5dfc210"))

// Creates ethereum account for every new user 
// assign public key and private key to user firestore document
export const onUserCreate = 
functions.firestore.document('users/{userId}').onCreate((snapshot, context) => {
    console.log('A new user has been added.')

    const account = web3.eth.accounts.create()
    const address = account.address
    const privateKey = account.privateKey
    
    console.log(`Generated ethereum address: ${address} for new user`)
    
    return snapshot.ref.update({ address: address, privateKey: privateKey})
})
