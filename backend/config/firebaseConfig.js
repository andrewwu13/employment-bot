import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// 1. Retrieve the JSON string from the environment variable
const serviceAccountJsonString = process.env.FIREBASE_ADMIN_CONFIG;

// 2. Add a check to ensure the environment variable is set
if (!serviceAccountJsonString) {
  console.error(
    "Error: FIREBASE_ADMIN_CONFIG environment variable is not set. " +
    "Please ensure your .env file is correctly configured with the service account JSON."
  );
  process.exit(1); // Exit the process if critical credentials are missing
}

// 3. Parse the JSON string into a JavaScript object
const serviceAccount = JSON.parse(serviceAccountJsonString); 

// 4. Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Optional: If you plan to use Realtime Database or Cloud Storage
  // with the Admin SDK, you might need to specify these too.
  // Replace YOUR_PROJECT_ID with your actual project ID if you include these.
  // databaseURL: "https://employment-bot-42bbe.firebaseio.com",
  // storageBucket: "employment-bot-42bbe.appspot.com"
});

// Get the Firestore instance
const db = admin.firestore();
const auth = admin.auth();

export { db, auth, admin };
