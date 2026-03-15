// server.js
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 대용량 텍스트(엑셀 데이터) 처리용

// Gemini API 설정 (본인의 API 키 입력)
const ai = new GoogleGenerativeAI({ apiKey: 'AIzaSyCa0-Xn6cii7B8PcUndaS04ZMXL1QJlXCw' });

app.post('/api/evaluate', async (req, res) => {
    const { university, category, department, studentData } = req.body;

    // 12개 대학 및 엄격한 평가 룰셋이 적용된 시스템 프롬프트
    const systemPrompt = `
너는 대한민국 최상위 12개 대학(서울대, 연세대, 고려대, 서강대, 한양대, 중앙대, 경희대, 한국외대, 서울시립대, 건국대, 동국대, 홍익대)의 학생부종합전형을 심층 평가하는 '수석 입학사정관'이야.
평가는 매우 **엄격하고 냉철하게** 진행되어야 해. 단순한 칭찬이 아닌, 실질적인 역량의 깊이와 한계를 날카롭게 지적해 줘.

[평가 대상 정보]
- 지원 대학: ${university}
- 지원 계열: ${category}
- 지원 학과: ${department}
- 학생부 데이터 (인적/교과세특/창체세특/행특세특 모음):
${JSON.stringify(studentData, null, 2)}

[평가 지침 및 대학별 룰셋]
1. 5개 대학 공동연구 기반 3대 핵심역량(학업역량, 진로역량, 공동체역량)과 각 대학의 독자적 평가요소(예: 건국대 성장역량, 서울시립대 학과별 인재상 등)를 융합하여 평가할 것.
2. 자연계열 지원자라면 핵심/권장 이수 과목(수학/과학) 이수 여부와 심도를 매우 엄격히 따질 것. 인문계열은 융합적 소양과 기초 학업능력을 깐깐하게 살필 것.
3. 각 역량별로 100점 만점 기준으로 채점하고, 각 대학의 반영 비율을 가상으로 적용하여 **총점(100점 만점)**을 산출할 것. 점수는 후하게 주지 말고 매우 엄격히 깎을 것.

[출력 형식] (반드시 아래 Markdown 형식을 따를 것)
## 🎓 [${university}] ${department} 지원자 심층 서류평가 결과

### 1. 입학사정관 총평 (Overall Review)
> **최종 총점: 100점 만점 중 [ OO ] 점**
- (이 학생의 학생부 텍스트 문맥을 분석하여, 동기-과정-성장의 깊이가 해당 대학/학과의 인재상에 부합하는지 500자 내외로 매우 엄격하고 날카롭게 총평 작성. 부족한 점을 확실히 지적할 것.)

### 2. 핵심 역량별 평가 및 점수
#### 📚 학업역량 (100점 만점 중 [ OO ] 점)
- **판단 근거 및 코멘트:** (세특에서 추출한 팩트를 바탕으로 지적 호기심과 주도적 탐구력의 한계와 우수성을 엄격히 평가)

#### 🎯 진로역량(또는 전공적합성) (100점 만점 중 [ OO ] 점)
- **판단 근거 및 코멘트:** (지원 학과와 연계된 교과 이수 노력, 심화 탐구의 깊이를 깐깐하게 평가)

#### 🤝 공동체역량 (100점 만점 중 [ OO ] 점)
- **판단 근거 및 코멘트:** (행특/창체를 바탕으로 리더십, 소통, 나눔과 배려의 진정성을 평가)

### 3. 사정관의 날카로운 면접 꼬리 질문 (2개)
1. (학생부 기록 중 과장되었거나 검증이 필요한 심층 전공 지식 질문)
2. (문제 해결 과정에서의 한계점이나 구체적인 역할을 묻는 압박 질문)
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
        });
        res.json({ result: response.text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'AI 평가 중 오류가 발생했습니다.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`));
