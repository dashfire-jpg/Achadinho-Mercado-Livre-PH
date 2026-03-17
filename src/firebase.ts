import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Validate config
const isValidConfig = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'TODO_KEYHERE';

const app = initializeApp(isValidConfig ? firebaseConfig : {
  apiKey: "invalid",
  authDomain: "invalid",
  projectId: "invalid",
  storageBucket: "invalid",
  messagingSenderId: "invalid",
  appId: "invalid"
});

export const auth = getAuth(app);

// Ensure persistence is set to local to help with iframe issues
if (isValidConfig) {
  setPersistence(auth, browserLocalPersistence).catch(err => console.error("Erro ao definir persistência:", err));
}

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
