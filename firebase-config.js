
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtmxLoEIncNY-9_zyypEPgWEUNV_0mMHs",
  authDomain: "sistema-gp-5fe24.firebaseapp.com",
  projectId: "sistema-gp-5fe24",
  storageBucket: "sistema-gp-5fe24.firebasestorage.app",
  messagingSenderId: "80532029580",
  appId: "1:80532029580:web:ba7b41a79adad2774c7ba9"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa os serviços
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, app, firebaseConfig };
