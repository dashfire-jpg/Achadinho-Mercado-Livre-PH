import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Validate config
const isValidConfig = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'TODO_KEYHERE';

if (!isValidConfig) {
  console.error("Firebase config is missing or invalid. Please check firebase-applet-config.json");
}

const app = initializeApp(isValidConfig ? firebaseConfig : {
  apiKey: "invalid-key-placeholder",
  authDomain: "invalid.firebaseapp.com",
  projectId: "invalid-project",
  storageBucket: "invalid.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
});

export const auth = getAuth(app);

// Ensure persistence is set to local to help with iframe issues
if (isValidConfig) {
  setPersistence(auth, browserLocalPersistence).catch(err => console.error("Erro ao definir persistência:", err));
}

// Use the database ID from config if available, otherwise default
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
