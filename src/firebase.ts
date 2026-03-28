import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Set persistence to indexedDB for better reliability on mobile/partitioned browsers
setPersistence(auth, indexedDBLocalPersistence).catch(err => {
  console.error("Persistence error:", err);
});
