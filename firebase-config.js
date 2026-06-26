// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCvqqngwvG9wDWEnSYB6xjTS3VPukU5ipw",
  authDomain: "school-managment-8c102.firebaseapp.com",
  projectId: "school-managment-8c102",
  storageBucket: "school-managment-8c102.firebasestorage.app",
  messagingSenderId: "288441699527",
  appId: "1:288441699527:web:4b8b3d68f0f418800b82e2",
  measurementId: "G-0NTW5SSM1F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
