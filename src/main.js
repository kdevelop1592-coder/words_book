import { fetchWordData } from './api.js';
import { auth, loginWithGoogle, logout, observeAuth, saveWord, getWordsByMonth } from './firebase.js';
import { WordQuiz } from './quiz.js';

let currentUser = null;
let currentMonthWords = [];
let quizInstance = null;

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const authSection = document.getElementById('auth-section');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// --- Section 1: 단어 등록 ---
const searchForm = document.getElementById('search-form');
const wordInput = document.getElementById('word-input');
const wordPreview = document.getElementById('latest-word-preview');
const searchLoading = document.getElementById('search-loading');

// --- Section 2: 리스트 ---
const monthSelect = document.getElementById('month-select');
const wordListContainer = document.getElementById('word-list-container');

// --- Section 3: 퀴즈 ---
const quizMonthSelect = document.getElementById('quiz-month-select');
const startQuizBtn = document.getElementById('start-quiz-btn');
const quizWarning = document.getElementById('quiz-warning');

const quizSetup = document.getElementById('quiz-setup');
const quizPlay = document.getElementById('quiz-play');
const quizResult = document.getElementById('quiz-result');

const quizWord = document.getElementById('quiz-word');
const quizCurrentNum = document.getElementById('quiz-current-num');
const quizTotalNum = document.getElementById('quiz-total-num');
const quizOptions = document.getElementById('quiz-options');
const quizFeedback = document.getElementById('quiz-feedback');
const nextQuizBtn = document.getElementById('next-quiz-btn');
const quizAudioBtn = document.getElementById('quiz-audio-btn');

const finalScoreEl = document.getElementById('final-score');
const totalQuestionsEl = document.getElementById('total-questions');
const retryQuizBtn = document.getElementById('retry-quiz-btn');

let currentQuizAudioUrl = "";

// -----------------------------------------------------
// Auth
// -----------------------------------------------------
observeAuth((user) => {
    currentUser = user;
    if (user) {
        authSection.innerHTML = `
            <span style="margin-right:1rem;color:#1a237e;font-weight:600;">환영합니다, ${user.displayName || '테스트 사용자'}님!</span>
            <button id="logout-btn" class="btn btn-secondary">로그아웃</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await logout();
            window.location.reload();
        });

        // 로그인 후 월별 목록 세팅
        populateMonthOptions();
        loadWordList('all');
    } else {
        authSection.innerHTML = `<button id="login-btn" class="btn btn-primary">구글 로그인</button>`;
        document.getElementById('login-btn').addEventListener('click', async () => {
            await loginWithGoogle();
        });
        wordListContainer.innerHTML = '<p class="empty-state">단어장을 보려면 먼저 로그인해주세요.</p>';
        wordPreview.classList.add('hidden');
    }
});

if (document.getElementById('login-btn')) {
    document.getElementById('login-btn').addEventListener('click', loginWithGoogle);
}

// -----------------------------------------------------
// Tabs 
// -----------------------------------------------------
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 버튼 활성화 토글
        document.querySelector('.tab-btn.active').classList.remove('active');
        btn.classList.add('active');

        // 컨텐츠 활성화 토글
        const targetId = btn.getAttribute('data-target');
        document.querySelector('.tab-content.active').classList.remove('active');
        document.querySelector('.tab-content.active').classList.add('hidden');

        const targetSection = document.getElementById(targetId);
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');

        // 탭 전환 시 데이터 다시 로드
        if (targetId === 'list-section') {
            loadWordList(monthSelect.value);
        }
        if (targetId === 'quiz-section') {
            resetQuizView();
        }
    });
});

// -----------------------------------------------------
// 1. 단어 검색 & 등록
// -----------------------------------------------------
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert("먼저 로그인해주세요.");
        return;
    }

    const word = wordInput.value.trim().toLowerCase();
    if (!word) return;

    searchLoading.classList.remove('hidden');
    wordPreview.classList.add('hidden');

    try {
        // 1. API에서 단어 뜻 찾기
        const wordData = await fetchWordData(word);

        // 2. 프리뷰 렌더링
        renderWordPreview(wordData);
        wordPreview.classList.remove('hidden');

        // 3. Firestore에 저장
        await saveWord(currentUser.uid, wordData);

        wordInput.value = "";
    } catch (err) {
        alert(`검색 실패: ${err.message}`);
    } finally {
        searchLoading.classList.add('hidden');
    }
});

function renderWordPreview(wordData) {
    const meaningsHtml = wordData.meanings.map(m => `<li>${m}</li>`).join('');
    const audioHtml = wordData.audioUrl ?
        `<button class="icon-btn" onclick="new Audio('${wordData.audioUrl}').play()" title="발음 듣기">🔊</button>` : '';

    wordPreview.innerHTML = `
      <div class="word-header">
        <h3 class="word-title">${wordData.word} ${audioHtml}</h3>
        <span class="phonetic">${wordData.phonetic}</span>
      </div>
      <ul class="meaning-list">${meaningsHtml}</ul>
      <div class="word-meta">방금 단어장에 추가됨 ✨</div>
    `;
}

// -----------------------------------------------------
// 2. 단어장 목록
// -----------------------------------------------------
// 월별 필터 옵션 생성 (최근 12개월)
function populateMonthOptions() {
    const now = new Date();
    monthSelect.innerHTML = '<option value="all">전체보기</option>';
    quizMonthSelect.innerHTML = '';

    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;

        monthSelect.innerHTML += `<option value="${val}">${label}</option>`;
        quizMonthSelect.innerHTML += `<option value="${val}">${label}</option>`;
    }
}

monthSelect.addEventListener('change', (e) => loadWordList(e.target.value));

async function loadWordList(monthKey) {
    if (!currentUser) return;

    wordListContainer.innerHTML = '<p class="empty-state">로딩 중... ⏳</p>';
    try {
        const words = await getWordsByMonth(currentUser.uid, monthKey);
        currentMonthWords = words; // 퀴즈용 복사본

        if (words.length === 0) {
            wordListContainer.innerHTML = '<p class="empty-state">등록된 단어가 없습니다. 검색 탭에서 추가해보세요!</p>';
            return;
        }

        wordListContainer.innerHTML = words.map(wordData => {
            const meaningsHtml = wordData.meanings.map(m => `<li>${m}</li>`).join('');
            // onclick="new Audio(url).play()" 처리는 글로벌 스코프로 접근 가능해야 하므로 inline 적용
            // 모듈이라 전역 함수로 작동 안할 것을 대비해 html 데이터 속성과 이벤트 위임 활용
            return `
        <div class="word-card">
          <div class="word-header">
             <h3 class="word-title">${wordData.word} 
                ${wordData.audioUrl ? `<button class="icon-btn play-audio-btn" data-url="${wordData.audioUrl}">🔊</button>` : ''}
             </h3>
             <span class="phonetic">${wordData.phonetic}</span>
          </div>
          <ul class="meaning-list">${meaningsHtml}</ul>
          <div class="word-meta">${new Date(wordData.createdAt?.seconds * 1000).toLocaleDateString() || '오늘'}</div>
        </div>
      `;
        }).join('');

        // 이벤트 위임으로 오디오 재생 붙이기
        const audioBtns = wordListContainer.querySelectorAll('.play-audio-btn');
        audioBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-url');
                if (url) new Audio(url).play();
            });
        });

    } catch (err) {
        wordListContainer.innerHTML = `<p class="empty-state" style="color:red">불러오기 실패: ${err.message}</p>`;
    }
}

// -----------------------------------------------------
// 3. 5지선다 퀴즈
// -----------------------------------------------------
function resetQuizView() {
    quizSetup.classList.remove('hidden');
    quizPlay.classList.add('hidden');
    quizResult.classList.add('hidden');
    quizWarning.classList.add('hidden');
}

startQuizBtn.addEventListener('click', async () => {
    if (!currentUser) { alert("로그인이 필요합니다."); return; }

    // 선택한 월 기준 단어 로드
    const month = quizMonthSelect.value;
    const words = await getWordsByMonth(currentUser.uid, month);

    if (words.length < 5) {
        quizWarning.classList.remove('hidden');
        return;
    }

    // 퀴즈 시작
    quizInstance = new WordQuiz(words);
    quizInstance.generateQuiz(10); // 최대 10문제

    quizSetup.classList.add('hidden');
    quizPlay.classList.remove('hidden');

    renderCurrentQuestion();
});

quizAudioBtn.addEventListener('click', () => {
    if (currentQuizAudioUrl) new Audio(currentQuizAudioUrl).play();
});

nextQuizBtn.addEventListener('click', () => {
    quizInstance.nextQuestion();
    if (quizInstance.isFinished()) {
        showQuizResult();
    } else {
        renderCurrentQuestion();
    }
});

retryQuizBtn.addEventListener('click', resetQuizView);

function renderCurrentQuestion() {
    const q = quizInstance.getCurrentQuestion();

    quizCurrentNum.textContent = quizInstance.currentQuestionIndex + 1;
    quizTotalNum.textContent = quizInstance.questions.length;

    quizWord.textContent = q.word;
    currentQuizAudioUrl = q.audioUrl || "";
    quizAudioBtn.style.display = currentQuizAudioUrl ? 'inline-block' : 'none';

    // 옵션 렌더링
    quizOptions.innerHTML = '';
    quizFeedback.classList.add('hidden');
    quizFeedback.className = 'quiz-feedback hidden';
    nextQuizBtn.classList.add('hidden');

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${idx + 1}. ${opt.text}`;

        btn.addEventListener('click', () => handleOptionClick(btn, opt.isCorrect));
        quizOptions.appendChild(btn);
    });
}

function handleOptionClick(clickedBtn, isCorrect) {
    if (!nextQuizBtn.classList.contains('hidden')) return; // 이미 선택한 경우 무시

    // 정답 체크
    quizInstance.checkAnswer(isCorrect);

    // 버튼 색상 변경 및 정답 표시
    const allBtns = quizOptions.querySelectorAll('.option-btn');
    const q = quizInstance.getCurrentQuestion();

    allBtns.forEach((btn, idx) => {
        btn.disabled = true; // 비활성화
        const opt = q.options[idx];
        if (opt.isCorrect) btn.classList.add('correct');
    });

    if (!isCorrect) {
        clickedBtn.classList.add('wrong');
        quizFeedback.textContent = "❌ 틀렸습니다!";
        quizFeedback.classList.add('wrong-text');
    } else {
        quizFeedback.textContent = "✅ 정답입니다!";
        quizFeedback.classList.add('correct-text');
    }

    quizFeedback.classList.remove('hidden');
    nextQuizBtn.classList.remove('hidden');
}

function showQuizResult() {
    quizPlay.classList.add('hidden');
    quizResult.classList.remove('hidden');

    const result = quizInstance.getScore();
    finalScoreEl.textContent = result.score;
    totalQuestionsEl.textContent = result.total;

    const messages = ['분발하세요! 😅', '조금만 더 노력해봐요! 💪', '참 잘했어요! 🎉', '완벽해요! 💯'];
    const acc = result.score / result.total;
    if (acc === 1) document.getElementById('result-message').textContent = messages[3];
    else if (acc >= 0.7) document.getElementById('result-message').textContent = messages[2];
    else if (acc >= 0.4) document.getElementById('result-message').textContent = messages[1];
    else document.getElementById('result-message').textContent = messages[0];
}
