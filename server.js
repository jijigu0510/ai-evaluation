// 1. 서버 시작 시 가장 먼저 .env 파일을 읽어오도록 설정 (매우 중요)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' })); 
app.use(express.json({ limit: '50mb' })); 
app.use(express.static(__dirname));

// 2. 환경 변수에서 키를 제대로 가져왔는지 확실하게 검사
const apiKey = process.env.GEMINI_API_KEY;

console.log("=========================================");
if (!apiKey) {
    console.error("❌ [에러] GEMINI_API_KEY 환경 변수를 찾을 수 없습니다.");
    console.error("❌ 해결책: 프로젝트 폴더 최상단에 .env 파일을 만들고 키를 입력하세요.");
} else {
    console.log("✅ [성공] API 키 로드 완료! (키 길이: " + apiKey.length + "자)");
}
console.log("=========================================");

app.get('/api/health', (req, res) => {
    res.json({ status: '정상 작동 중', key_설정여부: !!apiKey });
});

app.post('/api/evaluate', async (req, res) => {
    console.log("🟢 [서버] 프론트엔드로부터 평가 요청이 들어왔습니다!");

    try {
        const { university, category, department, studentName, studentData } = req.body;

        if (!apiKey) {
            throw new Error('서버에 API 키가 설정되지 않았습니다. 터미널 로그를 확인해주세요.');
        }

        const prompt = `
너는 대한민국 최상위 12개 대학의 학생부종합전형을 심층 평가하는 수석 입학사정관 시스템이야.
아래 제공된 [지원 대상 정보]와 [학생부 데이터]를 바탕으로 분석하고 채점표를 작성해 줘.

[지원 대상 정보]
- 지원 대학: ${university}
- 지원 계열: ${category}
- 지원 학과: ${department}
- 평가 대상 학생: ${studentName || '이름 없음'}

[학생부 데이터]
${JSON.stringify(studentData, null, 2)}

---

### <대학별 특별 평가 룰셋>
1. [서울대]: 자기주도적 학습 경험, 지적 호기심
2. [연세대/고려대]: 전공 연계 교과이수 핵심 권장과목 필수 확인
3. [서강대]: 폭넓은 융합적 성장가능성
4. [한양대]: 실용적 문제해결력(IC-PBL)
5. [중앙대]: 탐구형/융합형 여부 파악 및 심화 탐구 역량
6. [경희대]: 진로 탐색 활동의 자발성
7. [한국외대]: 글로벌 융복합 인재(외국어+AI/데이터)
8. [서울시립대]: 모집단위별 인재상 부합 여부
9. [건국대]: 성장역량(자기주도성과 창의적 문제해결력)
10. [동국대]: 전공수학역량과 전공관심도
11. [홍익대]: 창의·융합적 사고능력

---
### <출력 형식 (AI 입학사정관 평가 보고서)>
반드시 마크다운 형식으로 아래 양식에 맞춰 작성해줘.

## 🎓 [${university}] [${department}] 서류평가 결과 보고서
### 1. 종합 평가 요약 (총평)
### 2. 대학별 맞춤 평가 지표 분석
### 3. 학과별 전공적합성 및 권장과목 이수 심층 분석
### 4. 사정관의 최종 조언 및 면접 대비 질문 2가지
`;

        // 3. 404 에러 방지를 위해 가장 범용적이고 최신인 gemini-2.0-flash 모델로 변경
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        console.log("⏳ [서버] 구글 서버로 전송 중... (사용 모델: gemini-2.0-flash)");

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`🔴 [구글 AI 에러]: ${response.status} - ${errorText}`);
            throw new Error(`구글 서버 연동 실패: ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('AI가 응답을 거부했거나 텍스트를 만들지 못했습니다.');
        }

        console.log("✅ [서버] AI 평가 완료! 프론트엔드로 전달 성공.");
        res.status(200).json({ result: text });

    } catch (error) {
        console.error("🔴 [서버 내부 에러]:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버가 포트 ${PORT} 에서 실행 중입니다. http://localhost:${PORT}`));