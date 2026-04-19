// /api/ask.js
// 플레이어 질문에 AI가 답변 + 정답 시도 감지
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const API_KEY = (process.env.ANTHROPIC_API_KEY || '').replace(/["'\s]/g, '');
  if (!API_KEY) return res.status(500).json({ error: '서버 환경 변수 ANTHROPIC_API_KEY 누락' });

  const { secretWord, secretCategory, question } = req.body;
  if (!secretWord || !question) return res.status(400).json({ error: 'secretWord and question are required' });

  const systemPrompt = `You are a 20 Questions game host. The secret word is "${secretWord}" (category: ${secretCategory}).

Rules:
- IMPORTANT: Auto-correct common STT phonetic errors before answering.
  Examples: "is it double" → "edible", "is it a lemon" → "animal", "can you eight it" → "eat it"
- If the player's question is a direct guess of the secret word, set type to "guess".
- For yes/no questions, answer naturally in 1-2 sentences in English.
- Never reveal the secret word unless the guess is correct.
- Be consistent with previous answers.

Return ONLY this JSON (no markdown, no extra text):
{"type":"question","answer":"Yes, it is an animal."}
or for a correct guess:
{"type":"guess","correct":true,"answer":"That's correct! It's a ${secretWord}!"}
or for a wrong guess:
{"type":"guess","correct":false,"answer":"No, that's not right. Keep trying!"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Player: "${question}"` }]
      })
    });

    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: e.error?.message || `Anthropic error ${response.status}` });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('AI 응답 형식 오류');

    return res.status(200).json(JSON.parse(match[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
