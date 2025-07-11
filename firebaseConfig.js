
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyAMNNWxoA5Xz4xA0IHm40yKf-ahFjplmFI",
  authDomain: "cafe-da-computacao.firebaseapp.com",
  databaseURL: "https://cafe-da-computacao-default-rtdb.firebaseio.com",
  projectId: "cafe-da-computacao",
  storageBucket: "cafe-da-computacao.firebasestorage.app",
  messagingSenderId: "976711742918",
  appId: "1:976711742918:web:dd601bb912da3c3225eec7",
  measurementId: "G-ZWZKNRE7PL"
  };
  /*
  const firebaseConfig = {
    apiKey: "AIzaSyDDvQJ0DFm96SyXncT7uSx2ppNPwNifLuU",
    authDomain: "cafe-testes.firebaseapp.com",
    databaseURL: "https://cafe-testes-default-rtdb.firebaseio.com",
    projectId: "cafe-testes",
    storageBucket: "cafe-testes.firebasestorage.app",
    messagingSenderId: "835113689218",
    appId: "1:835113689218:web:64735722dfbd645f3e149b",
    measurementId: "G-8H246VT42N"
  };
  */

const app = initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
