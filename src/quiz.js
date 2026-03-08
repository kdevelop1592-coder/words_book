// quiz.js

export class WordQuiz {
    constructor(words) {
        this.words = [...words]; // 복사본
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
    }

    // 퀴즈 생성 로직: 최소 5단어 이상 필요
    generateQuiz(numberOfQuestions = 10) {
        if (this.words.length < 5) {
            throw new Error("단어 목록이 5개 미만이라 퀴즈를 생성할 수 없습니다.");
        }

        // 단어 목록 섞기
        this.words.sort(() => Math.random() - 0.5);

        // 최대 문제 수 제한 (보유 단어 수만큼)
        const totalQ = Math.min(numberOfQuestions, this.words.length);
        this.questions = [];

        for (let i = 0; i < totalQ; i++) {
            const correctWord = this.words[i];
            // 정답 뜻 추출 (첫 번째 뜻 우선, 없으면 빈 문자열)
            const correctMeaning = correctWord.meanings && correctWord.meanings.length > 0
                ? correctWord.meanings[0] : "뜻 없음";

            // 오답 목록 생성 (정답을 제외한 다른 단어들에서 무작위 선택)
            const wrongWords = this.words.filter(w => w.id !== correctWord.id);
            wrongWords.sort(() => Math.random() - 0.5);

            const options = [{ text: correctMeaning, isCorrect: true }];

            // 4개의 오답 추가 (단어가 부족하면 중복이 생길 수 있으나 filter 로 안전하게 5지선다 채움)
            for (let j = 0; j < 4 && j < wrongWords.length; j++) {
                const wrongMeaning = wrongWords[j].meanings && wrongWords[j].meanings.length > 0
                    ? wrongWords[j].meanings[0] : "뜻 없음 " + j;
                options.push({ text: wrongMeaning, isCorrect: false });
            }

            // 보기 섞기
            options.sort(() => Math.random() - 0.5);

            this.questions.push({
                word: correctWord.word,
                audioUrl: correctWord.audioUrl,
                options: options
            });
        }

        this.currentQuestionIndex = 0;
        this.score = 0;
    }

    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }

    isFinished() {
        return this.currentQuestionIndex >= this.questions.length;
    }

    checkAnswer(isCorrect) {
        if (isCorrect) {
            this.score++;
        }
    }

    nextQuestion() {
        this.currentQuestionIndex++;
    }

    getScore() {
        return {
            score: this.score,
            total: this.questions.length
        };
    }
}
