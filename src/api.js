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

        // 뜻(Meanings) 배열 추출. (간단히 최대 3개의 품사와 첫번째 정의만 가져옴)
        const meanings = [];
        if (result.meanings && result.meanings.length > 0) {
            result.meanings.slice(0, 3).forEach(meaning => {
                const pos = meaning.partOfSpeech;
                const def = meaning.definitions[0].definition; // 첫 번째 뜻만
                meanings.push(`[${pos}] ${def}`);
            });
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
