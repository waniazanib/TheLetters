/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Safely load the JSON config using Vite's glob import to prevent build failures on production environments (e.g., Vercel) where the config file is absent.
const meta = import.meta as any;
const configFiles = meta.glob('../firebase-applet-config.json', { eager: true });
const configPaths = Object.keys(configFiles);
const jsonConfig = configPaths.length > 0 ? (configFiles[configPaths[0]] as any).default : null;

// Vercel-style VITE_ environment variables
const envConfig = {
  apiKey: meta.env?.VITE_FIREBASE_API_KEY || meta.env?.VITE_API_KEY,
  authDomain: meta.env?.VITE_FIREBASE_AUTH_DOMAIN || meta.env?.VITE_AUTH_DOMAIN,
  projectId: meta.env?.VITE_FIREBASE_PROJECT_ID || meta.env?.VITE_PROJECT_ID,
  storageBucket: meta.env?.VITE_FIREBASE_STORAGE_BUCKET || meta.env?.VITE_STORAGE_BUCKET,
  messagingSenderId: meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || meta.env?.VITE_MESSAGING_SENDER_ID,
  appId: meta.env?.VITE_FIREBASE_APP_ID || meta.env?.VITE_APP_ID,
  firestoreDatabaseId: meta.env?.VITE_FIREBASE_DATABASE_ID || meta.env?.VITE_FIRESTORE_DATABASE_ID || meta.env?.VITE_DATABASE_ID
};

const firebaseConfig = {
  apiKey: envConfig.apiKey || jsonConfig?.apiKey || '',
  authDomain: envConfig.authDomain || jsonConfig?.authDomain || '',
  projectId: envConfig.projectId || jsonConfig?.projectId || '',
  storageBucket: envConfig.storageBucket || jsonConfig?.storageBucket || '',
  messagingSenderId: envConfig.messagingSenderId || jsonConfig?.messagingSenderId || '',
  appId: envConfig.appId || jsonConfig?.appId || '',
  firestoreDatabaseId: envConfig.firestoreDatabaseId || jsonConfig?.firestoreDatabaseId || '(default)'
};

let isFirebaseRunning = false;
let db: any = null;
let auth: any = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== '') {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    isFirebaseRunning = true;
    console.log('Firebase services initialized successfully.');
  } else {
    console.warn('Firebase configuration is empty. Running in Offline Sandbox Mode.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase SDK:', error);
}

export { db, auth, isFirebaseRunning };
export default firebaseConfig;
