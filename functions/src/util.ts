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

export const guid = () => {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }
  