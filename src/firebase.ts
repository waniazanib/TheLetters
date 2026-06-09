import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import jsonConfig from '../firebase-applet-config.json';

const envConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    import.meta.env.VITE_API_KEY,

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    import.meta.env.VITE_AUTH_DOMAIN,

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    import.meta.env.VITE_PROJECT_ID,

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    import.meta.env.VITE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    import.meta.env.VITE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    import.meta.env.VITE_APP_ID,

  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    import.meta.env.VITE_FIRESTORE_DATABASE_ID ||
    import.meta.env.VITE_DATABASE_ID
};

const firebaseConfig = {
  apiKey: envConfig.apiKey || jsonConfig?.VITE_FIREBASE_API_KEY || '',
  authDomain: envConfig.authDomain || jsonConfig?.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: envConfig.projectId || jsonConfig?.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: envConfig.storageBucket || jsonConfig?.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId:
    envConfig.messagingSenderId || jsonConfig?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: envConfig.appId || jsonConfig?.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId:
    envConfig.firestoreDatabaseId ||
    jsonConfig?.VITE_FIREBASE_DATABASE_ID ||
    '(default)'
};

let isFirebaseRunning = false;
let db: any = null;
let auth: any = null;

try {
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);

    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);

    isFirebaseRunning = true;
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase configuration missing');
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

export { db, auth, isFirebaseRunning };
export default firebaseConfig;