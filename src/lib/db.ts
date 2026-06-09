/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signInAnonymously,
  sendEmailVerification,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth, isFirebaseRunning } from '../firebase';
import { Letter, SenderType, PlacedStamp } from '../types';

// Enum for Firestore operations as required by the Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global custom error handler as required by the skill
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Secure Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Local Storage keys for offline resilience
const LOCAL_LETTERS_KEY = 'theletters_local_db';
const LOCAL_FAVORITES_KEY = 'theletters_local_favorites';
const LOCAL_USER_KEY = 'theletters_local_user';
const RECEIVED_TRACKER_KEY = 'theletters_received';

// Offline user model helper
export interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  isAnonymous: boolean;
}

// Core Database Manager
export const DB = {
  // Authentication services
  isOnline(): boolean {
    return isFirebaseRunning && auth !== null && db !== null;
  },

  async getCurrentUser(): Promise<LocalUser | null> {
    if (this.isOnline()) {
      const user: FirebaseUser | null = auth.currentUser;
      if (user) {
        if (!user.isAnonymous && !user.emailVerified) {
          const isRegistering = localStorage.getItem('theletters_registering') === 'true';
          if (!isRegistering) {
            try {
              await signOut(auth);
            } catch (e) { }
            localStorage.removeItem(LOCAL_USER_KEY);
            return null;
          }
        }
        return {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Sender',
          isAnonymous: false,
        };
      }
    }

    const local = localStorage.getItem(LOCAL_USER_KEY);
    return local ? JSON.parse(local) : null;
  },

  // Listen to Auth State Changes
  subscribeToAuth(callback: (user: LocalUser | null) => void) {
    if (this.isOnline()) {
      return onAuthStateChanged(auth, async (user) => {
        if (user) {
          if (!user.isAnonymous && !user.emailVerified) {
            const isRegistering = localStorage.getItem('theletters_registering') === 'true';
            if (isRegistering) {
              return; // Skip propagating this transient unverified auth state change
            }
            try {
              await signOut(auth);
            } catch (e) { }
            localStorage.removeItem(LOCAL_USER_KEY);
            callback(null);
            return;
          }
          const lUser = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || (user.isAnonymous ? 'Honorable Guest' : 'Stationery Patron'),
            isAnonymous: user.isAnonymous,
          };
          callback(lUser);
        } else {
          // Check local guest mode
          const local = localStorage.getItem(LOCAL_USER_KEY);
          callback(local ? JSON.parse(local) : null);
        }
      });
    }

    // Offline interval poll or standard callback
    const local = localStorage.getItem(LOCAL_USER_KEY);
    callback(local ? JSON.parse(local) : null);
    return () => { };
  },

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<LocalUser> {
    if (this.isOnline()) {
      try {
        localStorage.setItem('theletters_registering', 'true');
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName });

        // Send validation email
        await sendEmailVerification(credential.user);

        // Log them out immediately until they click the link in their mail!
        await signOut(auth);
        localStorage.removeItem(LOCAL_USER_KEY);
        localStorage.removeItem('theletters_registering');

        throw new Error('VERIFICATION_EMAIL_SENT');
      } catch (error) {
        localStorage.removeItem('theletters_registering');
        throw new Error(error instanceof Error ? error.message : 'Registration failed');
      }
    } else {
      // Create local user
      const localUser: LocalUser = {
        uid: `local_user_${Math.random().toString(36).substr(2, 9)}`,
        email,
        displayName,
        isAnonymous: false,
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      return localUser;
    }
  },

  async signInWithEmail(email: string, password: string): Promise<LocalUser> {
    if (this.isOnline()) {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);

        // Block unverified sign-in
        if (!credential.user.emailVerified) {
          await sendEmailVerification(credential.user);
          await signOut(auth);
          localStorage.removeItem(LOCAL_USER_KEY);
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        // Register or sync users in local and Firestore 'users' index
        const userEmailNormalized = (credential.user.email || '').toLowerCase().trim();
        if (userEmailNormalized) {
          await setDoc(doc(db, 'users', userEmailNormalized), {
            uid: credential.user.uid,
            email: userEmailNormalized,
            displayName: credential.user.displayName || 'Stationery Patron',
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        const lUser = {
          uid: credential.user.uid,
          email: credential.user.email || '',
          displayName: credential.user.displayName || 'Stationery Patron',
          isAnonymous: false,
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(lUser));
        return lUser;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Authentication failed');
      }
    } else {
      // Retrieve or match name
      const localUser: LocalUser = {
        uid: 'local_premium_user',
        email,
        displayName: email.split('@')[0],
        isAnonymous: false,
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      return localUser;
    }
  },

  async signInWithGoogle(): Promise<LocalUser> {
    if (this.isOnline()) {
      try {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(auth, provider);

        // Check if verified
        if (!credential.user.emailVerified) {
          await signOut(auth);
          localStorage.removeItem(LOCAL_USER_KEY);
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        // Register or sync users in 'users'
        const userEmailNormalized = (credential.user.email || '').toLowerCase().trim();
        if (userEmailNormalized) {
          await setDoc(doc(db, 'users', userEmailNormalized), {
            uid: credential.user.uid,
            email: userEmailNormalized,
            displayName: credential.user.displayName || 'Google Patron',
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        const lUser = {
          uid: credential.user.uid,
          email: credential.user.email || '',
          displayName: credential.user.displayName || 'Google Patron',
          isAnonymous: false,
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(lUser));
        return lUser;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Google Login failed');
      }
    } else {
      const localUser: LocalUser = {
        uid: 'local_google_user',
        email: 'google.patron@example.com',
        displayName: 'Aesthetic Patron',
        isAnonymous: false,
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      return localUser;
    }
  },

  async logout(): Promise<void> {
    if (this.isOnline()) {
      await signOut(auth);
    }
    localStorage.removeItem(LOCAL_USER_KEY);
  },

  async resetPassword(email: string): Promise<void> {
    if (this.isOnline()) {
      const userEmailNormalized = email.toLowerCase().trim();
      const userRef = doc(db, 'users', userEmailNormalized);
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          throw new Error('USER_NOT_FOUND_IN_DB');
        }
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        if (error instanceof Error && error.message === 'USER_NOT_FOUND_IN_DB') {
          throw error;
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to send recovery link');
      }
    } else {
      console.log(`Simulated reset password email for: ${email}`);
    }
  },

  async enterGuestMode(displayName: string = 'Honorable Guest'): Promise<LocalUser> {
    if (this.isOnline()) {
      try {
        const credential = await signInAnonymously(auth);
        const guestUser: LocalUser = {
          uid: credential.user.uid,
          email: 'anonymous@theletters.app',
          displayName,
          isAnonymous: true,
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(guestUser));
        return guestUser;
      } catch (err) {
        console.error('Failed online signInAnonymously, falling back to unique local guest', err);
      }
    }

    let guestId = localStorage.getItem('theletters_offline_guest_id');
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('theletters_offline_guest_id', guestId);
    }

    const guestUser: LocalUser = {
      uid: guestId,
      email: 'guest@theletters.app',
      displayName,
      isAnonymous: true,
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(guestUser));
    return guestUser;
  },

  // Letter operation methods
  async createLetter(letter: Letter): Promise<void> {
    // Generate secure unpredictable id if needed
    if (!letter.id) {
      letter.id = Math.random().toString(36).substr(2, 11) + Math.random().toString(36).substr(2, 11);
    }

    // Always mirror to local storage first, to guarantee data persistence
    const letters = this.getLocalLetters();
    const idx = letters.findIndex(l => l.id === letter.id);
    if (idx !== -1) {
      letters[idx] = letter;
    } else {
      letters.push(letter);
    }
    this.saveLocalLetters(letters);

    if (this.isOnline()) {
      const path = `letters/${letter.id}`;
      try {
        await setDoc(doc(db, 'letters', letter.id), letter);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  },

  async getLetter(id: string): Promise<Letter | null> {
    if (this.isOnline()) {
      const path = `letters/${id}`;
      try {
        const snap = await getDoc(doc(db, 'letters', id));
        if (snap.exists()) {
          const lData = snap.data() as Letter;
          let currentUserId = auth?.currentUser?.uid;
          if (!currentUserId) {
            try {
              const savedUserStr = localStorage.getItem(LOCAL_USER_KEY);
              if (savedUserStr) {
                const savedUser = JSON.parse(savedUserStr);
                currentUserId = savedUser.uid;
              }
            } catch (e) { }
          }
          if (!currentUserId || lData.senderId !== currentUserId) {
            this.trackReceivedLetter(id);
          }
          return lData;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }

    // Fallback to local search
    const localLetters = this.getLocalLetters();
    const found = localLetters.find(l => l.id === id);
    if (found) {
      let currentUserId = auth?.currentUser?.uid;
      if (!currentUserId) {
        try {
          const savedUserStr = localStorage.getItem(LOCAL_USER_KEY);
          if (savedUserStr) {
            const savedUser = JSON.parse(savedUserStr);
            currentUserId = savedUser.uid;
          }
        } catch (e) { }
      }
      if (!currentUserId || found.senderId !== currentUserId) {
        this.trackReceivedLetter(id);
      }
      return found;
    }
    return null;
  },

  async incrementViewCount(id: string): Promise<void> {
    if (this.isOnline()) {
      const path = `letters/${id}`;
      try {
        const snap = await getDoc(doc(db, 'letters', id));
        if (snap.exists()) {
          const currentCount = snap.data().viewCount || 0;
          await updateDoc(doc(db, 'letters', id), {
            viewCount: currentCount + 1
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    const letters = this.getLocalLetters();
    const idx = letters.findIndex(l => l.id === id);
    if (idx !== -1) {
      letters[idx].viewCount = (letters[idx].viewCount || 0) + 1;
      this.saveLocalLetters(letters);
    }
  },

  async deleteLetter(id: string): Promise<void> {
    if (this.isOnline()) {
      const path = `letters/${id}`;
      try {
        await deleteDoc(doc(db, 'letters', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }

    const letters = this.getLocalLetters();
    const filtered = letters.filter(l => l.id !== id);
    this.saveLocalLetters(filtered);
  },

  async updateLetter(id: string, letter: Partial<Letter>): Promise<void> {
    const letters = this.getLocalLetters();
    const idx = letters.findIndex(l => l.id === id);
    if (idx !== -1) {
      letters[idx] = { ...letters[idx], ...letter };
      this.saveLocalLetters(letters);
    }

    if (this.isOnline()) {
      const path = `letters/${id}`;
      try {
        await updateDoc(doc(db, 'letters', id), letter);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  },

  async getMyLetters(userId: string): Promise<Letter[]> {
    if (this.isOnline() && auth.currentUser !== null) {
      const path = 'letters';
      try {
        const q = query(collection(db, 'letters'), where('senderId', '==', userId));
        const res = await getDocs(q);
        const onlineLetters: Letter[] = [];
        res.forEach((doc) => {
          onlineLetters.push(doc.data() as Letter);
        });

        // Merge with local letters for offline compatibility and return
        // We let local letters overwrite online letters to ensure local edits/seals win over stale databases cached values instantly
        const local = this.getLocalLetters().filter(l => l.senderId === userId);
        const mergedMap = new Map<string, Letter>();
        onlineLetters.forEach(l => mergedMap.set(l.id, l));
        local.forEach(l => mergedMap.set(l.id, l));
        return Array.from(mergedMap.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    // Offline filter
    return this.getLocalLetters()
      .filter(l => l.senderId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getReceivedLetters(): Promise<Letter[]> {
    // Collect track ID array
    const trackingStr = localStorage.getItem(RECEIVED_TRACKER_KEY);
    const trackingIds: string[] = trackingStr ? JSON.parse(trackingStr) : [];

    let currentUserId = auth?.currentUser?.uid;
    if (!currentUserId) {
      try {
        const savedUserStr = localStorage.getItem(LOCAL_USER_KEY);
        if (savedUserStr) {
          const savedUser = JSON.parse(savedUserStr);
          currentUserId = savedUser.uid;
        }
      } catch (e) { }
    }

    const resultListMap = new Map<string, Letter>();
    const selfTrackingIdsToPurge: string[] = [];

    // Fetch tracked letters
    for (const trackingId of trackingIds) {
      const letter = await this.getLetter(trackingId);
      if (letter) {
        if (!currentUserId || letter.senderId !== currentUserId) {
          resultListMap.set(letter.id, letter);
        } else {
          selfTrackingIdsToPurge.push(trackingId);
        }
      }
    }

    // Clean trackingIds locally to remove historical self-authored data
    if (selfTrackingIdsToPurge.length > 0) {
      const cleanIds = trackingIds.filter(id => !selfTrackingIdsToPurge.includes(id));
      localStorage.setItem(RECEIVED_TRACKER_KEY, JSON.stringify(cleanIds));
    }

    return Array.from(resultListMap.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Track shared letter opened by this browser instance
  trackReceivedLetter(id: string) {
    const trackingStr = localStorage.getItem(RECEIVED_TRACKER_KEY);
    const trackingIds: string[] = trackingStr ? JSON.parse(trackingStr) : [];
    if (!trackingIds.includes(id)) {
      trackingIds.push(id);
      localStorage.setItem(RECEIVED_TRACKER_KEY, JSON.stringify(trackingIds));
    }
  },

  toggleFavoriteLetter(id: string): void {
    const favoritesStr = localStorage.getItem(LOCAL_FAVORITES_KEY);
    let favList: string[] = favoritesStr ? JSON.parse(favoritesStr) : [];
    if (favList.includes(id)) {
      favList = favList.filter(f => f !== id);
    } else {
      favList.push(id);
    }
    localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(favList));
  },

  isLetterFavorite(id: string): boolean {
    const favoritesStr = localStorage.getItem(LOCAL_FAVORITES_KEY);
    const favList: string[] = favoritesStr ? JSON.parse(favoritesStr) : [];
    return favList.includes(id);
  },

  // Helper getters for LocalStorage
  getLocalLetters(): Letter[] {
    const local = localStorage.getItem(LOCAL_LETTERS_KEY);
    return local ? JSON.parse(local) : [];
  },

  saveLocalLetters(letters: Letter[]) {
    localStorage.setItem(LOCAL_LETTERS_KEY, JSON.stringify(letters));
  },

  // Validates connections as requested in the Firebase skill
  async validateFirestoreConnection(): Promise<void> {
    if (!this.isOnline()) return;
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration or network status.');
      }
    }
  }
};
