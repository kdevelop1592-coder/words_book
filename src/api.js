/**
 * Free Dictionary API 연동
 * https://dictionaryapi.dev/
 */

export const fetchWordData = async (word) => {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("단어를 찾을 수 없습니다.");
            }
            throw new Error("API 서버 오류가 발생했습니다.");
        }

        const data = await response.json();
        const result = data[0]; // 첫 번째 결과 사용

        // 발음 기호 추출
        let phonetic = result.phonetic || "";
        if (!phonetic && result.phonetics && result.phonetics.length > 0) {
            const p = result.phonetics.find(item => item.text);
            if (p) phonetic = p.text;
        }

        // 오디오 추출
        let audioUrl = "";
        if (result.phonetics && result.phonetics.length > 0) {
            const audioItem = result.phonetics.find(item => item.audio && item.audio !== "");
            if (audioItem) audioUrl = audioItem.audio;
        }

        // 품사 한글 매핑 함수
        const posMap = {
            noun: "명사",
            verb: "동사",
            adjective: "형용사",
            adverb: "부사",
            pronoun: "대명사",
            preposition: "전치사",
            conjunction: "접속사",
            interjection: "감탄사"
        };

        // 단어 자체의 핵심 뜻 번역 (예: tree -> 나무)
        let coreMeaning = "";
        try {
            const wordTransUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(result.word)}`;
            const wordTransRes = await fetch(wordTransUrl);
            const wordTransData = await wordTransRes.json();
            coreMeaning = wordTransData[0][0][0];
        } catch (e) {
            console.warn("Core word translation failed", e);
        }

        // 뜻(Meanings) 배열 추출 + 예문 포함
        const meanings = [];
        if (result.meanings && result.meanings.length > 0) {
            for (const m of result.meanings.slice(0, 3)) {
                const pos = posMap[m.partOfSpeech] || m.partOfSpeech;
                const def = m.definitions[0].definition;
                const example = m.definitions[0].example || "";

                let translatedDef = "";
                let translatedExample = "";

                try {
                    // 정의 번역 (필요한 경우 핵심 뜻으로 대체하거나 병행)
                    const defTransUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(def)}`;
                    const defRes = await fetch(defTransUrl);
                    const defData = await defRes.json();
                    translatedDef = defData[0][0][0];

                    // 예문 번역
                    if (example) {
                        const exTransUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(example)}`;
                        const exRes = await fetch(exTransUrl);
                        const exData = await exRes.json();
                        translatedExample = exData[0][0][0];
                    }
                } catch (tErr) {
                    translatedDef = def;
                }

                // 결과 구성: [품사] 핵심뜻 (정의 요약) + 예문
                let finalMeaning = `[${pos}] ${coreMeaning || translatedDef}`;
                if (example) {
                    finalMeaning += `\n- ex: ${example}`;
                    if (translatedExample) finalMeaning += ` (${translatedExample})`;
                }
                meanings.push(finalMeaning);
            }
        }

        return {
            word: result.word,
            phonetic,
            audioUrl,
            meanings
        };

    } catch (err) {
        console.error("fetchWordData Error:", err);
        throw err;
    }
};
