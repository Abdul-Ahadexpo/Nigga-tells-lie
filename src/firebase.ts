import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDafFGXAPvJM25ukqNZSm4ra5S6ACCfbEs",
  authDomain: "money-4a855.firebaseapp.com",
  databaseURL: "https://money-4a855-default-rtdb.firebaseio.com",
  projectId: "money-4a855",
  storageBucket: "money-4a855.firebasestorage.app",
  messagingSenderId: "893595455729",
  appId: "1:893595455729:web:6ce038d127b3e2f3abd950"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);