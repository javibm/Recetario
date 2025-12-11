// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBv-E1Z6Chy3jX_OHdOxY1XLk75Rjt6muU",
    authDomain: "recetario-6f700.firebaseapp.com",
    projectId: "recetario-6f700",
    storageBucket: "recetario-6f700.firebasestorage.app",
    messagingSenderId: "1074447371366",
    appId: "1:1074447371366:web:e0689be620d903fe1671a7"
};

console.log("DEBUG: [firebase-init.js] Starting initialization...");

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("DEBUG: [firebase-init.js] firebase.initializeApp success");
} catch (e) {
    console.error("CRITICAL ERROR: [firebase-init.js] firebase.initializeApp failed", e);
}

const db = firebase.firestore();
db.settings({ experimentalForceLongPolling: true });
const auth = firebase.auth();

console.log("DEBUG: [firebase-init.js] Firebase Initialized. DB and Auth objects created.");
console.log("DEBUG: [firebase-init.js] Exposing global variables: db, auth");
