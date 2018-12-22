# mojo-cloud-functions

## Cloud Functions

### rate

Used when user A rates user B
Updates user B rating, when user B enters mojo house sends to him welcome JOtokens

Usage:
```
functions.httpsCallable("rate").call(["uid": user.uid]) { (result, error) in
  if let error = error as NSError? {
    if error.domain == FunctionsErrorDomain {
      let code = FunctionsErrorCode(rawValue: error.code)
      let message = error.localizedDescription
      let details = error.userInfo[FunctionsErrorDetailsKey]
    }
    // ...
  }
}
```

### sendJoTokens

Sends Jo tokens from user wallet to another ethereum address

Usage:
```
functions.httpsCallable("sendJoTokens").call(["to": eth_address, "value":100000]) { (result, error) in
  if let error = error as NSError? {
    if error.domain == FunctionsErrorDomain {
      let code = FunctionsErrorCode(rawValue: error.code)
      let message = error.localizedDescription
      let details = error.userInfo[FunctionsErrorDetailsKey]
    }
    // ...
  }
}
```

### getBalance

Returns Jo tokens balance in wei

Usage:
```
functions.httpsCallable("getBalance").call() { (result, error) in
  if let error = error as NSError? {
    if error.domain == FunctionsErrorDomain {
      let code = FunctionsErrorCode(rawValue: error.code)
      let message = error.localizedDescription
      let details = error.userInfo[FunctionsErrorDetailsKey]
    }
    // ...
  }
}
```

### drinkTypes

### myDrinks

### buyDrink

## Tokens

### JOToken

```
0xfEc08bb2439bf6Bb207480F78B9db5C0b6aa50cE
```

### ERC721 marketplace token

```
0xe47cf472013d612f73f67a92c056bb5dcfd1a8f5
```
