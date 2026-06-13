import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

let firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || ""
};

// Conditionally load the local config file if it exists (for AI Studio/local dev),
// without breaking the build in GitHub Actions when the file is missing/gitignored.
const localConfig = import.meta.glob("../firebase-applet-config.json", { eager: true });
if (localConfig["../firebase-applet-config.json"]) {
  firebaseConfig = (localConfig["../firebase-applet-config.json"] as any).default || localConfig["../firebase-applet-config.json"];
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local for better session handling
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Persistence error:", err);
});

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  // Prompt for account to make it easier for users to switch or confirm
  provider.setCustomParameters({ prompt: 'select_account' });
  
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    // Alert the user if the popup is blocked
    if (error.code === 'auth/popup-blocked') {
      alert("Please allow popups for this site to sign in.");
    } else {
      alert("Sign in failed: " + error.message);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};
