export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { lang } = req.body;
  
  const rawKey = process.env.ANTHROPIC_API_KEY || '';
  const API_KEY = rawKey.replace(/["']/g, '').trim();

  if (!API_KEY) {
    return res.status(500).json({ error: "[500] Vercel 환경 변수 누락: ANTHROPIC_API_KEY가 설정되지 않았습니다." });
  }

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
        max_tokens: 100,
        system: 'Return raw JSON only. {"word":"...","category":"..."}',
        messages: [{ role: 'user', content: lang === 'ko' ? '스무고개용 랜덤 단어 하나 골라줘. 형식: {"word":"고양이","category":"동물"}' : 'Pick a random word for 20 questions. Format: {"word":"apple","category":"food"}' }]
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || '알 수 없는 에러';
        return res.status(response.status).json({ error: `[${response.status}] Anthropic 거절: ${errMsg} (크레딧 잔액이나 키를 확인하세요)` });
    }

    const data = await response.json();
    const text = data.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON 파싱 실패");
    
    res.status(200).json(JSON.parse(match[0]));
  } catch (error) {
    res.status(500).json({ error: `서버 내부 오류: ${error.message}` });
  }
}
