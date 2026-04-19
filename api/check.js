export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { secretWord, secretCategory, question } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  // 🛡️ API 키 사전 검사 로직 추가
  if (!API_KEY || API_KEY.trim() === '') {
    return res.status(401).json({ error: { message: "Vercel 환경 변수에 ANTHROPIC_API_KEY가 설정되지 않았습니다." }});
  }

  const systemPrompt = `You are a 20 Questions host. Return ONLY valid JSON. 
Autocorrect STT errors (e.g. "is it double" -> "edible"). 
Give natural, organic 1-2 sentence answers based on context. No line breaks.`;

  const userPrompt = `Word: "${secretWord}"
User: "${question}"
JSON Format: {"type":"question","answer":"..."}`;

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
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: errorData.error?.message || `API Status: ${response.status}` });
    }

    const data = await response.json();
    let text = data.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답 형식이 올바르지 않습니다.");
    
    res.status(200).json(JSON.parse(match[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
