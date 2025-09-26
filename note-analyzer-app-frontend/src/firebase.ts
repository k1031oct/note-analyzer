// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";


const firebaseConfig = {
  apiKey: "AIzaSyAUMriY3vRal2q7uZqonxctciPGwlZK6HU",
  authDomain: "note-analyzer-7e70d.firebaseapp.com",
  projectId: "note-analyzer-7e70d",
  storageBucket: "note-analyzer-7e70d.firebasestorage.app",
  messagingSenderId: "1059573275968",
  appId: "1:1059573275968:web:620a3c4b21926534ea2ea5",
  measurementId: "G-G5F5R7K7RV"
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Ld7vckrAAAAADdWGyn9oz-dg10vpkOJ_zU6qEQb'),
  isTokenAutoRefreshEnabled: true
});

// 他のファイルで使えるように、各機能をエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-northeast1");