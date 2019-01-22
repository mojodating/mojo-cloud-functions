import * as firebase from 'firebase';

const config = {
    apiKey: "AIzaSyDFnnKsggZqXDcZKHFjQGVd6PpnRiVicrw",
    authDomain: "mojodating-prealpha.firebaseapp.com",
    databaseURL: "https://mojodating-prealpha.firebaseio.com",
    projectId: "mojodating-prealpha",
    storageBucket: "mojodating-prealpha.appspot.com",
    messagingSenderId: "617219767268"
  };

firebase.initializeApp(config);

const email = "jerzy@test.com";
const password = "test1234";

console.log('test');

firebase.functions
firebase.auth()
    .signInWithEmailAndPassword(email, password)
    .then(user => user.user.getIdToken())
    .then(token => {
        console.log('start execution');
        const addMessage = firebase.functions().httpsCallable('sendConversationRequest');
        addMessage({ uid: 'cYXmb8rvI2Q3S0vyc07SQP9upCo2', text: 'another hej', drinktypeid: 'qGQJ7vqGfteqmwaQTLq5' }).then(function(result) {
            console.log('result: ', result);
        })
        .catch(err => { console.log('inner error: ', err); });
    })
    .catch(err => {
        console.log('error: ', err);
    });
