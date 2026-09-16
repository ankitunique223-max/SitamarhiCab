// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDjDMk0BkW4wll8oysestEPlYsNnayYJHg",
  authDomain: "sitamarhicab-ba312.firebaseapp.com",
  projectId: "sitamarhicab-ba312",
  storageBucket: "sitamarhicab-ba312.firebasestorage.app",
  messagingSenderId: "189791891816",
  appId: "1:189791891816:web:d7379f820707c656e826dd",
  measurementId: "G-HRHLD8Y7QS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export
export { auth, db };
