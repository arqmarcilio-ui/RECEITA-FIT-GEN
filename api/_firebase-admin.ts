import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

const firebaseConfig = {
  projectId: "project-51458118-b23c-4d4b-8dc",
  storageBucket: "project-51458118-b23c-4d4b-8dc.firebasestorage.app",
};

export function getFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is missing");
    }

    try {
      const parsedServiceAccount = JSON.parse(serviceAccount);
      initializeApp({
        credential: cert(parsedServiceAccount),
        storageBucket: firebaseConfig.storageBucket,
      });
    } catch (error) {
      console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", error);
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON");
    }
  }
  
  return {
    storage: getStorage(),
  };
}
