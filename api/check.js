export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { secretWord, secretCategory, question } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  // 1. 유기적인 답변(Organic Answers)과 STT 오류 보정을 동시에 지시
  const systemPrompt = `You are a highly intelligent and conversational host for a '20 Questions' game.

CRITICAL RULES:
1. You MUST return ONLY valid JSON. Do not include any introductory or explanatory text.
2. The user's input comes from STT. Infer the correct intent if there are phonetic errors (e.g., "is it double" -> "is it edible", "울에 살아" -> "물에 살아").
3. Provide ORGANIC, CONTEXTUAL, and NATURAL answers. Do NOT just say "Yes" or "No". Add helpful, specific context based on the secret word.
   - Example 1: (Word: Elephant, Q: "Can I see this one?") -> "Yes, but usually you have to go to a zoo or travel to Africa or Asia to see it."
   - Example 2: (Word: Sun, Q: "do we usually eat?") -> "No, you definitely cannot eat this! It is a giant star in the sky."
   - Example 3: (Word: Kimchi, Q: "is it double / edible?") -> "Yes, it is very edible and people in Korea eat it almost every day."`;

  const userPrompt = `Secret word: "${secretWord}" (category: ${secretCategory})
User's Raw STT input: "${question}"

Format your response EXACTLY like this JSON object:
If it's a direct correct guess:
{"type":"guess","correct":true,"answer":"Correct! It is ${secretWord}!"}
If it's an incorrect guess:
{"type":"guess","correct":false,"answer":"Not quite! Keep guessing."}
If it's a yes/no question:
{"type":"question","answer":"<Your natural, organic, contextual 1-2 sentence answer here>"}
`;

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
        max_tokens: 250, // 유기적인 긴 답변을 위해 토큰 수 증가
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) throw new Error(`Anthropic API Error: ${response.status}`);
    const data = await response.json();
    const rawText = data.content[0].text;
    
    // 2. 에러 방지용 무적 파싱 로직 (AI가 쓸데없는 말을 덧붙여도 JSON만 정확히 추출)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned invalid JSON format');
    
    const parsed = JSON.parse(jsonMatch[0]);
    res.status(200).json(parsed);

  } catch (error) {
    console.error('API Check Error:', error);
    res.status(500).json({ error: error.message });
  }
}
