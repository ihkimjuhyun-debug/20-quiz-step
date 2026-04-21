// /api/ask.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const KEY = (process.env.OPENAI_API_KEY ?? '').replace(/["'\r\n\t ]/g, '');
  if (!KEY) return res.status(500).json({ error: '[MISSING] OPENAI_API_KEY 환경 변수가 없습니다.' });
  if (!KEY.startsWith('sk-')) return res.status(500).json({ error: '[FORMAT] 키 형식 오류입니다.' });

  const { secretWord, secretCategory, question, history = [] } = req.body ?? {};
  if (!secretWord || !question) return res.status(400).json({ error: 'secretWord and question required' });

  const system = `You are an expert 20 Questions game host AND a smart speech-to-text interpreter.
Secret word: "${secretWord}" (category: ${secretCategory}).

## YOUR TWO JOBS

### JOB 1 — INTERPRET the player's input
The input may be garbled by speech recognition. Your job is to figure out what 20 Questions question they meant to ask.

**Common STT phonetic errors to auto-correct:**
- "double" → "edible" / "eatable"
- "eight it" / "eat eight" → "eat it"
- "where" → "wear"  
- "a lion" / "a lemon" → "an animal" / "alive"
- "is it a live" → "is it alive"
- "is it a meal" → "is it an animal"
- "can you drink it" / "is it drink" → "is it drinkable"
- "leaving thing" / "leaving" → "living thing"
- "in the sky" / "does it fly" → "can it fly"

### JOB 2 — ANSWER the reconstructed question
1. If player is directly guessing the secret word: type "guess"
2. All other yes/no questions: type "question", answer truthfully in 1 conversational sentence.

## OUTPUT FORMAT (STRICT — JSON only, no markdown)
{
  "type": "question",
  "interpreted": "Can you eat it?",
  "answer": "No, you cannot eat it."
}
OR for a correct guess:
{
  "type": "guess",
  "correct": true,
  "interpreted": "Is it an elephant?",
  "answer": "Yes! Correct! It's a ${secretWord}! 🎉"
}`;

  const historyMessages = history.slice(-6).flatMap(h => [
    { role: 'user', content: `Player: "${h.q}"` },
    { role: 'assistant', content: JSON.stringify({ type: 'question', answer: h.a }) }
  ]);

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 150,
        temperature: 0.3, 
        messages: [
          { role: 'system', content: system },
          ...historyMessages,
          { role: 'user', content: `Player: "${question}"` }
        ]
      })
    });

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: e.error?.message ?? `OpenAI HTTP ${r.status}` });
    }

    const data = await r.json();
    const text = data.choices[0].message.content ?? '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('JSON 파싱 실패: ' + text.slice(0, 80));

    return res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
