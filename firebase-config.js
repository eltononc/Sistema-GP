
// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDS2bc8QBdpxaUiQjF-duyzgQK2JrGoucg",
  authDomain: "stake-pro-db.firebaseapp.com",
  projectId: "stake-pro-db",
  storageBucket: "stake-pro-db.appspot.com",
  messagingSenderId: "569517541701",
  appId: "1:569517541701:web:11b31335fca1d5a708562c"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore
const db = getFirestore(app);

export { db };
