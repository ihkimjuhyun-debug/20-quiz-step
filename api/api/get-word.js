export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { lang } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = 'Return raw JSON only. No markdown.';
  const userPrompt = lang === 'ko'
      ? `스무고개용 단어 하나. 동물/음식/사물/유명인/장소 중 랜덤으로. 형식: {"word":"고양이","category":"동물"}`
      : `Pick one secret word for 20 Questions. Vary between: animal, food, object, famous person, landmark. Format: {"word":"elephant","category":"animal"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    const rawText = data.content.map(b => b.type === 'text' ? b.text : '').join('');
    const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
