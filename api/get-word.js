export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { lang } = req.body;
  
  // 1. 환경 변수 가져오기
  const rawKey = process.env.ANTHROPIC_API_KEY || '';
  
  // 🛡️ [자동 치유 로직] 혹시 실수로 들어간 따옴표(" , ')와 앞뒤 공백을 강제로 파괴
  const API_KEY = rawKey.replace(/["']/g, '').trim();

  // 2. 키가 아예 없는지 검사
  if (!API_KEY) {
    return res.status(500).json({ error: "Vercel 환경 변수에 키가 비어있습니다. 등록을 확인해주세요." });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY, // 정제된 키 사용
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
        // 🔍 [엑스레이 디버깅] 서버가 진짜로 읽고 있는 키의 상태를 에러 메시지에 포함 (보안상 앞 15자리만 표시)
        const keyInfo = `(인식된 키: ${API_KEY.substring(0, 15)}..., 길이: ${API_KEY.length})`;
        throw new Error(`[${response.status}] ${errorData.error?.message || '인증 실패'} ${keyInfo}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.content[0].text.replace(/```json|```/g, '').trim());
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
