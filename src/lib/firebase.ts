import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific settings
// We use a try-catch to avoid errors if it gets initialized elsewhere, 
// and we force long polling to resolve connectivity issues in restricted networks.
let database;
try {
  database = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  database = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = database;
export const auth = getAuth(app);

// Simple connection test
async function testConnection() {
  try {
    console.log("Testing Firestore connection to database:", firebaseConfig.firestoreDatabaseId);
    // Use getDocFromServer to force a network request
    const testDoc = doc(db, 'routes', 'connection-test');
    await getDocFromServer(testDoc);
    console.log("Firestore connection test: Network request reached backend.");
  } catch (error: any) {
    if (error && error.message && error.message.includes('the client is offline')) {
      console.error("Firestore connectivity error: Could not reach backend (client offline). Please check your internet connection or Firebase project status.");
    } else if (error && error.code === 'permission-denied') {
      console.log("Firestore connection test: Reached backend, but permission denied (this is expected for protected paths).");
    } else {
      console.warn("Firestore connection test info:", error.message || error);
    }
  }
}
testConnection();

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const loginAnonymously = async () => {
  return signInAnonymously(auth);
};
