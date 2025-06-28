// firebase.js
const { initializeApp } = require("firebase/app");
const {
  getFirestore, collection, addDoc, getDocs, getDoc, setDoc, doc
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyB3QaaSqehesGNWICf3Fy_ivlTXDhO3Rcw",
  authDomain: "expin-e890a.firebaseapp.com",
  projectId: "expin-e890a",
  storageBucket: "expin-e890a.firebasestorage.app",
  messagingSenderId: "1024873737617",
  appId: "1:1024873737617:web:667d7633e0206e4fd1be30",
  measurementId: "G-4G8VZSP7YW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db, collection, addDoc, getDocs, getDoc, setDoc, doc };
