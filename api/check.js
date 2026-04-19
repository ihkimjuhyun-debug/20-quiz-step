export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { secretWord, secretCategory, question } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  // 1. AI에게 스무고개 게임의 본질과 흔한 질문 패턴을 주입합니다.
  const systemPrompt = `You are a highly intelligent host for a '20 Questions' game. Return ONLY raw JSON, no markdown.

CRITICAL INSTRUCTION FOR STT (Speech-to-Text) ERRORS:
The user's input comes from voice dictation and will contain severe phonetic errors. You MUST understand the mechanics of 20 Questions. Players universally ask about specific categories. If the input sounds weird, you MUST phonetically map it to one of these common questions before answering:

1. Edibility (Food/Eating):
   - STT errors: "is it double", "eightable", "is it evil", "이거 먹을 쓰 있어"
   - Correct Intent: "Is it edible? / Can you eat it?"
2. Habitat/Location:
   - STT errors: "울에 살아", "바다에 나라"
   - Correct Intent: "Does it live in water? / 물에 살아?"
3. Animacy/Category:
   - STT errors: "바람이야", "애니 말"
   - Correct Intent: "Is it a person? (사람이야?) / Is it an animal?"
4. Size/Properties:
   - STT errors: "크가 커", "heavy"
   - Correct Intent: "Is it big? / Is it heavy?"

RULE: NEVER take nonsense literal. Always silently translate the phonetic noise into the most logical 20-Questions query based on the context above.`;

  // 2. 사용자의 입력을 교정 필터에 먼저 거친 후 답변을 생성하도록 지시합니다.
  const userPrompt = `Secret word: "${secretWord}" (category: ${secretCategory})
User's Raw STT input: "${question}"

Process:
1. Identify if the raw input contains STT phonetic errors.
2. Snap it to the closest logical 20-Questions query (e.g., "is it double" -> "is it edible").
3. Determine if the intent is a direct guess or a yes/no question.

If direct guess:
{"type":"guess","correct":true,"answer":"Correct! It is ${secretWord}!"}
or {"type":"guess","correct":false,"answer":"Not quite, keep asking!"}

If yes/no question (answer in one concise English sentence based on the CORRECTED intent):
{"type":"question","answer":"Yes, it is edible."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620', // 혹은 최신 모델 사용
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) throw new Error(`Anthropic API Error: ${response.status}`);
    const data = await response.json();
    const rawText = data.content[0].text;
    
    // JSON 파싱 에러 방지를 위한 안전 장치
    const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    res.status(200).json(parsed);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
