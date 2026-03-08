import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

// TODO: Replace with your actual Firebase project config 
// Users should provide their own firebase config in environment variables or hardcode for local testing
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 백엔드 프로젝트 연동 대비 빈 콘솔 대체 가능
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.warn("Firebase config is missing or invalid. Using dummy local testing setup.");
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
const provider = app ? new GoogleAuthProvider() : null;

// 로컬 테스트용 메모리 DB
const localWordsDB = [];

// 로그인
export const loginWithGoogle = async () => {
  if (!auth) {
    alert("Firebase가 설정되지 않았습니다. 현재는 로컬 모드(기능 제한)로 테스트 중입니다.");
    return { uid: 'local_user', displayName: '로컬 테스터' };
  }
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Login Error", error);
    throw error;
  }
};

// 로그아웃
export const logout = async () => {
  if (!auth) return;
  await signOut(auth);
};

// 상태 감지
export const observeAuth = (callback) => {
  if (!auth) {
    callback({ uid: 'local_user', displayName: '로컬 테스터' });
    return () => { };
  }
  return onAuthStateChanged(auth, callback);
};

// 단어 Firestore에 저장
export const saveWord = async (userId, wordData) => {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!db) {
    console.log("로컬 DB 저장 시뮬레이션:", wordData);
    localWordsDB.push({
      id: Date.now().toString(),
      userId: userId,
      monthKey: monthKey,
      word: wordData.word,
      meanings: wordData.meanings,
      phonetic: wordData.phonetic,
      audioUrl: wordData.audioUrl,
      createdAt: { seconds: Math.floor(now.getTime() / 1000) }
    });
    return true;
  }
  try {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Firestore words collection, document = auto ID
    await addDoc(collection(db, "words"), {
      userId: userId,
      monthKey: monthKey,
      word: wordData.word,
      meanings: wordData.meanings, // array
      phonetic: wordData.phonetic,
      audioUrl: wordData.audioUrl,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (err) {
    console.error("Save Word Error:", err);
    throw err;
  }
};

// 단어 목록 가져오기
export const getWordsByMonth = async (userId, monthKey) => {
  if (!db) {
    console.log("로컬 DB 조회 시뮬레이션");
    if (monthKey === 'all') {
      return [...localWordsDB].reverse();
    }
    return localWordsDB.filter(w => w.monthKey === monthKey).reverse();
  }

  const wordsRef = collection(db, "words");
  let q;

  if (monthKey === 'all') {
    q = query(wordsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
  } else {
    q = query(wordsRef, where("userId", "==", userId), where("monthKey", "==", monthKey), orderBy("createdAt", "desc"));
  }

  try {
    const querySnapshot = await getDocs(q);
    const words = [];
    querySnapshot.forEach((doc) => {
      words.push({ id: doc.id, ...doc.data() });
    });
    return words;
  } catch (err) {
    console.error("Get words error:", err);
    // 복합 색인(composite index) 에러인 경우 콘솔에 URL이 출력됩니다.
    throw err;
  }
};
