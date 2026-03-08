# Words Book Project Analysis 📚

이 프로젝트는 중학생을 대상으로 하는 **내 손안의 영어 단어장** 웹 애플리케이션입니다. 사용자는 모르는 단어를 검색하여 나만의 단어장에 저장하고, 월별로 복습하거나 퀴즈를 풀 수 있습니다.

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: HTML5, Vanilla CSS (Glassmorphism Design), JavaScript (ES Modules)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Backend**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **External API**: [Free Dictionary API](https://dictionaryapi.dev/) (단어 데이터 및 발음 오디오)

## 📂 프로젝트 구조 (Project Structure)

```text
words_book/
├── index.html          # 메인 HTML 구조 및 탭 레이아웃
├── style.css           # 프로젝트 스타일 (유리 효과 및 애니메이션)
├── package.json        # 종속성(Firebase, Vite) 및 스크립트 정의
└── src/
    ├── main.js         # 앱 메인 로직, UI 이벤트 핸들링, 탭 전환
    ├── firebase.js     # Firebase 설정 및 DB(Firestore) 입출력 로직
    ├── api.js          # Dictionary API 연동 및 데이터 가공
    └── quiz.js         # 5지선다 퀴즈 생성 및 채점 클래스 (WordQuiz)
```

## ✨ 주요 기능 (Key Features)

### 1. 단어 검색 및 등록 (Search & Add)
- **Free Dictionary API**를 사용하여 영어 단어의 뜻, 발음 기호, 음성 데이터를 실시간으로 가져옵니다.
- 검색된 결과는 사용자의 **Firestore** 내 단어장으로 자동 저장됩니다.
- 저장 시 현재 월 정보를 `monthKey`로 함께 저장하여 월별 관리가 가능합니다.

### 2. 내 단어장 (My Word List)
- 사용자가 저장한 단어들을 리스트 형태로 보여줍니다.
- **월별 필터링 기능**을 통해 특정 시기에 공부한 단어들만 모아볼 수 있습니다.
- 단어 카드에서 직접 발음을 들을 수 있는 오디오 기능을 지원합니다.

### 3. 월별 5지선다 퀴즈 (Monthly Quiz)
- 선택한 월에 저장된 단어들을 바탕으로 **5지선다 객관식 퀴즈**를 생성합니다. (최소 5단어 이상 필요)
- 무작위로 오답 보기를 생성하여 학습 효과를 높입니다.
- 퀴즈 종료 후 최종 점수와 성취도에 따른 피드백 메시지를 제공합니다.

### 4. 사용자 인증 (Authentication)
- **Google 로그인**을 지원하여 사용자마다 고유한 단어장을 가집니다.
- Firebase 설정이 없는 경우를 대비한 로컬 테스트용 메모리 DB 구현이 포함되어 있습니다.

## ⚠️ 참고 사항
- 현재 `src/firebase.js`의 `firebaseConfig`에는 실제 API Key와 프로젝트 ID가 설정되어 있지 않습니다. 실제 배포 및 사용을 위해서는 Firebase 프로젝트 설정이 필요합니다.
