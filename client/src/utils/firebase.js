// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth"; 
import { GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interviewedge-500cb.firebaseapp.com",
  projectId: "interviewedge-500cb",
  storageBucket: "interviewedge-500cb.firebasestorage.app",
  messagingSenderId: "289219072280",
  appId: "1:289219072280:web:2ff04bdd85f90da8c40e6d",
  measurementId: "G-3QTZ767D0Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export { auth, provider };