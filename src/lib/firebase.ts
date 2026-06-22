import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
// Request Google Drive and Google Sheets scopes as well as basic profile scopes
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/userinfo.email");
provider.addScope("https://www.googleapis.com/auth/userinfo.profile");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we have a user but no cached token, we can ask for login again
        // or check if there is a way to get a token. Since we are in the flow,
        // if cachedAccessToken is null, we can fallback to requiring signInWithPopup
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google OAuth access token from login");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Saves a single attendance record to Google Cloud Firestore database.
 */
export const saveRecordToFirestore = async (record: any): Promise<void> => {
  try {
    const docId = record.timestamp.replace(/[^a-zA-Z0-9]/g, "_");
    await setDoc(doc(db, "attendance_records", docId), record);
  } catch (error) {
    console.error("Error saving record to Firestore:", error);
    throw error;
  }
};

/**
 * Retrieves all attendance records from Firestore.
 */
export const getRecordsFromFirestore = async (): Promise<any[]> => {
  try {
    const q = collection(db, "attendance_records");
    const querySnapshot = await getDocs(q);
    const recordsList: any[] = [];
    querySnapshot.forEach((doc) => {
      recordsList.push(doc.data());
    });
    return recordsList;
  } catch (error) {
    console.error("Error getting records from Firestore:", error);
    throw error;
  }
};

/**
 * Deletes an attendance record from Firestore.
 */
export const deleteRecordFromFirestore = async (timestamp: string): Promise<void> => {
  try {
    const docId = timestamp.replace(/[^a-zA-Z0-9]/g, "_");
    await deleteDoc(doc(db, "attendance_records", docId));
  } catch (error) {
    console.error("Error deleting record from Firestore:", error);
    throw error;
  }
};

