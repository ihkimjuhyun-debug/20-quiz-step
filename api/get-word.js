// /api/get-word.js
// AI가 스무고개용 비밀 단어를 랜덤으로 선택
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const API_KEY = (process.env.ANTHROPIC_API_KEY || '').replace(/["'\s]/g, '');
  if (!API_KEY) return res.status(500).json({ error: '서버 환경 변수 ANTHROPIC_API_KEY 누락' });

  const { lang = 'en' } = req.body;

  const prompt = lang === 'ko'
    ? '스무고개를 위한 흥미로운 단어 하나를 골라줘. 동물, 음식, 사물, 장소, 유명인 중 하나. 형식: {"word":"고양이","category":"동물","hint":"living thing"}'
    : 'Pick an interesting word for 20 Questions. Choose from: animal, food, object, place, famous person. Format: {"word":"elephant","category":"animal","hint":"living thing"}';

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
        max_tokens: 120,
        system: 'Return ONLY a raw JSON object. No markdown, no explanation.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: e.error?.message || `Anthropic error ${response.status}` });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('JSON 파싱 실패');

    return res.status(200).json(JSON.parse(match[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
