export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { secretWord, secretCategory, question } = req.body;
  
  const rawKey = process.env.ANTHROPIC_API_KEY || '';
  const API_KEY = rawKey.replace(/["']/g, '').trim();

  if (!API_KEY) {
    return res.status(500).json({ error: "[500] Vercel 환경 변수 누락" });
  }

  const systemPrompt = `You are a 20 Questions host. Return ONLY valid JSON. 
Autocorrect STT phonetic errors (e.g. "is it double" -> "edible"). 
Give natural, organic 1-2 sentence answers based on context.`;

  const userPrompt = `Word: "${secretWord}"
User: "${question}"
JSON Format: {"type":"question","answer":"..."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: `[${response.status}] Anthropic 거절: ${errorData.error?.message || '인증/잔액 오류'}` });
    }

    const data = await response.json();
    const match = data.content[0].text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON 파싱 실패");
    
    res.status(200).json(JSON.parse(match[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
