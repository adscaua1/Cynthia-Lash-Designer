import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_KEY",
  authDomain: "agenda-fe7c0.firebaseapp.com",
  projectId: "agenda-fe7c0",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);