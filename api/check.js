export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { secretWord, secretCategory, question } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = `You are a highly intelligent 20 Questions game host. 
CRITICAL RULES:
1. Return ONLY valid JSON. No markdown formatting like \`\`\`json.
2. User input is from STT. Autocorrect phonetic errors quietly (e.g., "is it double" -> "edible", "울에 살아" -> "물에 살아").
3. Give organic, natural 1-2 sentence answers in the JSON. Add helpful, specific context based on the secret word instead of just Yes/No.
4. DO NOT use line breaks or unescaped quotes inside the answer string.`;

  const userPrompt = `Secret word: "${secretWord}" (category: ${secretCategory})
User STT input: "${question}"

Respond EXACTLY in this JSON format:
{"type":"question","answer":"Yes, you can usually see them in a zoo."}
Or if it is a direct correct guess:
{"type":"guess","correct":true,"answer":"Correct! It is ${secretWord}!"}
Or incorrect guess:
{"type":"guess","correct":false,"answer":"Not quite! Keep guessing."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // ⚡ 초고속 모델 (타임아웃 방지)
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Anthropic API Error: ${response.status}`);
    }

    const data = await response.json();
    let rawText = data.content[0].text.trim();
    
    // 에러 방지 무적 파싱 로직
    rawText = rawText.replace(/^```json/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(rawText);
    
    res.status(200).json(parsed);

  } catch (error) {
    console.error('API Check Error:', error);
    res.status(500).json({ error: error.message });
  }
}
