
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, getDocFromServer, collection, addDoc, query, where, orderBy, getDocs, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
const firebaseConfig = {
  apiKey: "AIzaSyB3ahZb8ww9FQs-ZGKm8ooXy6l5gjGeiDE",
  authDomain: "receita-fit-gen-2.firebaseapp.com",
  projectId: "receita-fit-gen-2",
  storageBucket: "receita-fit-gen-2.firebasestorage.app",
  messagingSenderId: "941794526294",
  appId: "1:941794526294:web:633f7b0815839d023be7f7",
  measurementId: "G-QSBXY4K7PH"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, doc, onSnapshot, getDocFromServer, ref, uploadString, getDownloadURL, collection, addDoc, query, where, orderBy, getDocs, updateDoc, deleteDoc, serverTimestamp };
