import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import firebaseConfig from '../firebase-applet-config.json';

export function getFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is missing");
    }

    try {
      const parsedServiceAccount = JSON.parse(serviceAccount);
      // Use the bucket from the environment variable, config file, or fallback to project-id
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || `${parsedServiceAccount.project_id}.appspot.com`;
      
      console.log(`[Firebase Admin] Initializing with project: ${parsedServiceAccount.project_id}`);
      console.log(`[Firebase Admin] Target bucket: ${bucketName}`);

      initializeApp({
        credential: cert(parsedServiceAccount),
        storageBucket: bucketName,
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
