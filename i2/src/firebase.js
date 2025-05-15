// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
 apiKey: "AIzaSyCLjRtggYgQt7IKHLrlx8gnJnTi87rGVdA",
  authDomain: "sample-c07f9.firebaseapp.com",
  projectId: "sample-c07f9",
  storageBucket: "sample-c07f9.firebasestorage.app",
  messagingSenderId: "711415598109",
  appId: "1:711415598109:web:1042e597d4e9121e290af4",
  measurementId: "G-B0NKDPW3DF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function saveUserToFirestore(user, extraData = {}) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const userData = {
      firstname: user.displayName?.split(' ')[0] || '',
      lastname: user.displayName?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      phone: user.phoneNumber || extraData.phone || '',
      businessName: extraData.businessName || '',
      createdAt: new Date().toISOString(),
    };
    await setDoc(userRef, userData);
  }
}
