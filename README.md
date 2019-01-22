# mojo-cloud-functions

## Cloud Functions

### rate

Used when user A rates user B
Updates user B rating, when user B enters mojo house sends to him welcome JOtokens

Usage:
```
functions.httpsCallable("rate").call(["uid": user.uid, "rate":number]) { (result, error) in
  if let error = error as NSError? {
    // ...
  }
}
```

### getBalance

Returns Jo tokens balance in ether

Usage:
```
functions.httpsCallable("getBalance").call() { (result, error) in
  if let error = error as NSError? {
    // ...
  }
}
```

### sendJoTokens

Sends Jo tokens from user wallet to another ethereum address

Usage:
```
functions.httpsCallable("sendJoTokens").call(["to": user.uid, "value":100000]) { (result, error) in
  if let error = error as NSError? {
    // ...
  }
}
```

## Tokens

### JOToken

JOToken is used for buying drinks in marketplace.
JOToken rinkeby address:

```
0xfEc08bb2439bf6Bb207480F78B9db5C0b6aa50cE
```

### ERC721 marketplace token

```
0xe47cf472013d612f73f67a92c056bb5dcfd1a8f5
```
