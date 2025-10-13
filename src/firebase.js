// src/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const cfg = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};


if (!cfg.apiKey || !cfg.projectId) {
  console.error('[firebase] Missing VITE_FIREBASE_* env. Check your .env file.');
}

const app  = initializeApp(cfg);

// Auth
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

const db = getFirestore(app);


const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
