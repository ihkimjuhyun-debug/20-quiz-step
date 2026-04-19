export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { lang } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // ⚡ 가장 빠른 모델로 타임아웃 방지
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
