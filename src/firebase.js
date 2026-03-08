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
  getDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";

// TODO: Replace with your actual Firebase project config 
// Users should provide their own firebase config in environment variables or hardcode for local testing
const firebaseConfig = {
  apiKey: "AIzaSyDKRIfgYXkoxD8xZhfD1QzkLoIHGk-vNL8",
  authDomain: "words-book-cc9c3.firebaseapp.com",
  projectId: "words-book-cc9c3",
  storageBucket: "words-book-cc9c3.firebasestorage.app",
  messagingSenderId: "380718132972",
  appId: "1:380718132972:web:aff367a26006fcff6cbfc9"
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
    return { uid: 'local_user', displayName: '로컬 테스터', email: 'local@example.com' };
  }
  try {
    // 공용 컴퓨터 보안: 매번 계정 선택 창을 띄움
    provider.setCustomParameters({ prompt: 'select_account' });
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
    const localUser = { uid: 'local_user', displayName: '로컬 테스터', email: 'local@example.com' };
    saveUser(localUser);
    callback(localUser);
    return () => { };
  }
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      await saveUser(user);
    }
    callback(user);
  });
};

// 사용자 정보 저장
export const saveUser = async (user) => {
  if (!db) return;
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      lastLogin: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Save User Error:", err);
  }
};

// 관리자 권한 확인
export const isAdmin = (user) => {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === 'kdevelop1592@gmail.com';
};

// 2차 비밀번호 저장
export const updateSecondaryPassword = async (userId, password) => {
  if (!db) return;
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      secondaryPassword: password // 실제 운영시에는 해싱 권장
    }, { merge: true });
  } catch (err) {
    console.error("Update Password Error:", err);
    throw err;
  }
};

// 사용자 데이터 가져오기 (비밀번호 포함)
export const getUserData = async (userId) => {
  if (!db) return null;
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
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

    // 중복 체크
    const q = query(collection(db, "words"), where("userId", "==", userId), where("word", "==", wordData.word));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return "already_exists";
    }

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

// 단어 삭제
export const deleteWord = async (wordId) => {
  if (!db) return;
  try {
    const wordRef = doc(db, "words", wordId);
    await deleteDoc(wordRef);
    return true;
  } catch (err) {
    console.error("Delete Word Error:", err);
    throw err;
  }
};

// 퀴즈 결과 저장
export const saveQuizResult = async (userId, resultData) => {
  if (!db) return;
  try {
    await addDoc(collection(db, "quiz_results"), {
      userId,
      ...resultData,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Save Quiz Result Error:", err);
    throw err;
  }
};

// 관리자 통계 데이터 조회 (사용자 목록 + 단어 수 + 퀴즈 요약)
export const getAdminSummaries = async () => {
  if (!db) return { users: [], quizStats: [] };

  try {
    // 1. 모든 사용자 가져오기
    const usersSnap = await getDocs(collection(db, "users"));
    const users = [];

    // 2. 각 사용자별 단어 수 집계
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const wordsQuery = query(collection(db, "words"), where("userId", "==", userData.uid));
      const wordsSnap = await getDocs(wordsQuery);
      users.push({
        ...userData,
        wordCount: wordsSnap.size
      });
    }

    // 3. 퀴즈 결과 가져오기 (전체 오답 통계용)
    const resultsSnap = await getDocs(collection(db, "quiz_results"));
    const quizResults = resultsSnap.docs.map(doc => doc.data());

    return { users, quizResults };
  } catch (err) {
    console.error("Get Admin Summaries Error:", err);
    throw err;
  }
};
