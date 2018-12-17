const ethutil = require('ethereumjs-util') 

export const formattedAddress = (address) => {
    return Buffer.from(ethutil.stripHexPrefix(address), 'hex');
};

export const formattedInt = (int) => {
    return ethutil.setLengthLeft(int, 32);
};

export const hashedTightPacked = (args) => {
    return ethutil.sha3(Buffer.concat(args));
};