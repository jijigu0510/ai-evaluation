// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
// CORS를 완전히 개방하여 로컬/배포 환경 어디서든 통신 가능하게 설정
app.use(cors({ origin: '*' })); 
app.use(express.json({ limit: '50mb' })); // 대용량 텍스트(엑셀 데이터) 처리용

// 현재 폴더의 파일들(index.html 등)을 웹에서 접근할 수 있도록 서빙합니다.
app.use(express.static(__dirname));

// Render 환경 변수 설정에서 GEMINI_API_KEY 값을 가져옵니다.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("⚠️ 경고: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
}

// 서버 생존 확인용 테스트 경로 (여기로 접속하면 서버가 켜져있는지 알 수 있습니다)
app.get('/api/health', (req, res) => {
    res.json({ status: '정상 작동 중', key_설정여부: !!apiKey });
});

app.post('/api/evaluate', async (req, res) => {
    console.log("🟢 [서버] 프론트엔드로부터 평가 요청이 들어왔습니다!");

    try {
        const { university, category, department, studentName, studentData } = req.body;

        if (!apiKey) {
            throw new Error('서버에 API 키가 없습니다. Render 대시보드의 Environment 탭에서 GEMINI_API_KEY를 추가해주세요.');
        }

        console.log(`📝 평가 대상: [${university}] ${department} - ${studentName || '이름 없음'} 학생`);
        console.log(`📊 학생 데이터 크기: 약 ${JSON.stringify(studentData).length} 바이트`);

        const prompt = `
너는 대한민국 최상위 12개 대학(서울대, 연세대, 고려대, 서강대, 한양대, 중앙대, 경희대, 한국외대, 서울시립대, 건국대, 동국대, 홍익대)의 학생부종합전형을 심층 평가하는 수석 입학사정관 시스템이야.
지금부터 아래 제공된 [지원 대상 정보]와 [학생부 데이터]를 바탕으로, 네가 가진 데이터베이스와 <대학별 특별 평가 룰셋>을 엄격하게 적용하여 학생의 서류를 분석하고 채점표를 작성해 줘.

[지원 대상 정보]
- 지원 대학: ${university}
- 지원 계열: ${category}
- 지원 학과: ${department}
- 평가 대상 학생: ${studentName || '이름 없음'}

[학생부 데이터]
${JSON.stringify(studentData, null, 2)}

---

### <대학별 특별 평가 룰셋 (반드시 해당 대학 지원 시 이 기준을 우선 적용할 것)>

1. [서울대학교]
- 평가 요소: 학업능력, 학업태도, 학업 외 소양 (전공적합성이라는 단어를 직접 쓰지 않음).
- 주안점: 단순 성적이 아닌 '자기주도적 학습 경험, 지적 호기심, 깊이 있는 배움에 대한 열의'. 주어진 교육 환경 내에서 얼마나 도전적으로 과목을 선택했는지(예: 소수 수강 과목 도전) 평가.

2. [연세대학교 & 고려대학교]
- 자연계열 지원 시 <전공 연계 교과이수 핵심 권장과목> 이수 여부 최우선 확인. (예: 기계공학=물리학I/II, 미적분, 기하 필수 / 생명과학=화학I, 생명과학I/II 필수).
- 인문계열은 폭넓은 융합적 사고와 독서 역량, 상경계열(경제/경영)은 수학적/통계적 역량(미적분, 확률과통계) 확인.

3. [서강대학교]
- 평가 요소: 학업역량(50%), 성장가능성(30%), 공동체역량(20%).
- 주안점: 좁은 의미의 '전공적합성'을 평가하지 않음. 문/이과 구분 없이 다전공 제도를 활용할 수 있는 '탄탄한 기초 학업역량'과 '폭넓은 융합적 성장가능성'을 최고로 우대할 것.

4. [한양대학교]
- 주안점: 학생부에 나타난 학생의 자기주도적 성취, 실용적 문제해결력(IC-PBL 성향), 그리고 지식을 실제 현실의 문제나 데이터에 적용해 본 융복합 탐구 역량을 중시.

5. [중앙대학교]
- 전형 분리 평가: 'CAU융합형(학업50/진로30/공동체20)'인지 'CAU탐구형(진로50/학업40/공동체10)' 파악.
- 탐구형의 경우, 전공 관련 깊이 있는 심화 탐구 역량과 동기-과정-결과-성장의 논리적 연결을 매우 깐깐하게 채점.

6. [경희대학교]
- 평가 요소: 학업역량(30%), 진로역량(50%), 공동체역량(20%).
- 주안점: 진로역량 비중이 높음. 전공(계열) 관련 교과 성취도뿐만 아니라 '진로 탐색 활동과 경험'의 자발성을 중시. 교과 이수 권장과목 준수 여부 필수 체크.

7. [한국외국어대학교]
- 주안점: 어학 능력 자체보다 '외국어 + 데이터/AI/국제통상'을 융합할 수 있는 글로벌 융복합 인재 선호. 다문화에 대한 개방성과 포용력(공동체역량) 강조.

8. [서울시립대학교]
- 주안점: 서류평가 시 <모집단위별 인재상> 부합 여부가 절대적 기준임. 학업역량, 잠재역량, 사회역량으로 평가. (예: 도시행정=공공성 및 소통역량, 환경공학=환경문제에 대한 내재적 동기부여 등).

9. [건국대학교]
- 평가 요소: 학업역량(30%), 진로역량(40%), 성장역량(10%), 공동체역량(20%). (전형/단과대별 비율 상이하나 '성장역량' 필수 반영).
- 주안점: '성장역량(스스로 목표를 세우고 경험을 확장하는 자기주도성과 창의적 문제해결력)'이라는 건국대만의 독자적 기준을 반드시 반영할 것.

10. [동국대학교]
- 평가 요소: 전공적합성(50%), 학업역량(30%), 인성 및 사회성(20%). (Do Dream 전형 기준)
- 주안점: 전공수학역량과 전공관심도를 가장 높게 평가함. 진로를 위해 적극적으로 탐구한 '동기'와 '과정'을 상세히 분석할 것.

11. [홍익대학교]
- 평가 요소: 학업역량(40%), 진로역량(40%), 공동체역량(20%).
- 주안점: '캠퍼스자율전공'을 운영하므로, 한 가지 좁은 전공에 얽매이지 않고 다양한 영역에 대한 '창의·융합적 사고능력'을 보여주는지를 핵심으로 평가.

---

### <출력 형식 (AI 입학사정관 평가 보고서)>
반드시 아래 양식에 맞추어 마크다운으로 깔끔하게 출력해 줘.

## 🎓 [${university}] [${department}] 서류평가 결과 보고서

### 1. 종합 평가 요약 (총평)
- 학생의 전반적인 서류 흐름이 해당 대학/학과가 요구하는 인재상과 얼마나 일치하는지 3~4문장으로 요약.

### 2. 대학별 맞춤 평가 지표 분석
(지원한 대학의 평가요소 비율 및 명칭을 정확히 사용하여 점수 A/B/C/D 및 평가 코멘트 작성)
* **[해당 대학 평가요소 1]:** 등급(A~D) | 학생부 추출 근거 및 코멘트
* **[해당 대학 평가요소 2]:** 등급(A~D) | 학생부 추출 근거 및 코멘트
* **[해당 대학 평가요소 3]:** 등급(A~D) | 학생부 추출 근거 및 코멘트

### 3. 학과별 전공적합성 및 권장과목 이수 심층 분석
* **관련 교과 이수 및 성취 판단:** 자연계열 지원일 경우 핵심 권장과목(수학/과학) 이수 여부를 추론하여 평가. 인문/사회계열일 경우 관련 역량(국/영/사/수학적 소양) 평가.
* **활동의 융복합성 및 심도:** 해당 학과 교수진이 좋아할 만한 전공 관련 심화 탐구(세특/동아리) 내용 분석.

### 4. 사정관의 최종 조언 및 면접 대비 질문 2가지
- 서류상 부족한 점이나 보완해야 할 점 지적.
- 이 서류를 바탕으로 실제 대학 면접에서 물어볼 만한 날카로운 꼬리 질문 2개 생성.
`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        console.log("⏳ [서버] Gemini API로 전송 중...");

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
            throw new Error(`구글 AI API 연동 실패 (상태코드: ${response.status})`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('AI가 응답을 거부했거나 텍스트를 만들지 못했습니다.');
        }

        console.log("✅ [서버] AI 평가 완료! 프론트엔드로 전달합니다.");
        // 에러를 뿜지 않고 무조건 200 성공으로 보내어 프론트엔드가 결과를 잘 받게 만듦
        res.status(200).json({ result: text });

    } catch (error) {
        console.error("🔴 [서버 내부 에러]:", error.message);
        // 서버가 죽지 않고 프론트엔드에게 어떤 에러인지 한글로 친절히 알려줌
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버가 포트 ${PORT} 에서 실행 중입니다.`));