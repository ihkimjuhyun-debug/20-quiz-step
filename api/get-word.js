export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { lang } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  // 🛡️ API 키 사전 검사 로직 추가
  if (!API_KEY || API_KEY.trim() === '') {
    return res.status(401).json({ error: { message: "Vercel 환경 변수에 ANTHROPIC_API_KEY가 설정되지 않았습니다." }});
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY.trim(), // 빈칸 강제 제거
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        system: 'Return raw JSON only. {"word":"...","category":"..."}',
        messages: [{ role: 'user', content: lang === 'ko' ? '랜덤 단어 하나 골라줘.' : 'Pick a random word.' }]
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: errorData.error?.message || `Anthropic API Error: ${response.status}` });
    }

    const data = await response.json();
    const parsed = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim());
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
