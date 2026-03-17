/**
 * GradeIQ — Firebase Logic Module
 * Handles Authentication and Firestore sync.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import firebaseConfig from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const Firebase = {
  auth,
  db,

  /**
   * Listen for Auth state changes
   */
  onAuthChange(callback) {
    onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  },

  /**
   * Google Sign In
   */
  async login() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Firebase Login Error:", error);
      throw error;
    }
  },

  /**
   * Sign Out
   */
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase Logout Error:", error);
    }
  },

  /**
   * Sync User Profile
   */
  async syncUserProfile(user) {
    if (!user) return null;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    const profile = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
      last_login: serverTimestamp()
    };

    if (!snap.exists()) {
      // New user
      profile.created_at = serverTimestamp();
      profile.university_system = "delta";
      await setDoc(userRef, profile);
      return { ...profile, is_new: true };
    } else {
      // Existing user - update non-settings fields
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        last_login: serverTimestamp()
      }, { merge: true });
      return snap.data();
    }
  },

  /**
   * Save Semester to Firestore
   */
  async saveSemester(userId, semester) {
    try {
      const semRef = doc(db, "users", userId, "semesters", semester.id);
      await setDoc(semRef, {
        ...semester,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error("Firestore Save Error:", error);
      throw error;
    }
  },

  /**
   * Delete Semester from Firestore
   */
  async deleteSemester(userId, semesterId) {
    try {
      const semRef = doc(db, "users", userId, "semesters", semesterId);
      await deleteDoc(semRef);
    } catch (error) {
      console.error("Firestore Delete Error:", error);
      throw error;
    }
  },

  /**
   * Fetch All Semesters from Firestore
   */
  async fetchSemesters(userId) {
    try {
      const q = query(
        collection(db, "users", userId, "semesters"),
        orderBy("date_saved", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data());
    } catch (error) {
      console.error("Firestore Fetch Error:", error);
      return [];
    }
  },

  /**
   * Update User Settings (e.g. University System)
   */
  async updateSettings(userId, settings) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { settings }, { merge: true });
    } catch (error) {
      console.error("Firestore Settings Update Error:", error);
    }
  }
};

export default Firebase;
