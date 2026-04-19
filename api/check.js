export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { secretWord, secretCategory, question } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  // STT의 발음 오인식(Phonetic Errors)을 찰떡같이 알아듣도록 강력하게 지시
  const systemPrompt = `You are a highly intelligent host for a 20 Questions game. Return ONLY raw JSON, no markdown.
CRITICAL: The user's input comes from an STT (Speech-to-Text) engine. It frequently makes severe phonetic mistakes. 
Examples of how you MUST interpret phonetic errors:
- Korean: "울에 살아?" -> Infer as "물에 살아?" (Does it live in water?)
- English: "is it double?" -> Infer as "is it edible/eatable?"
- Korean: "바람이야?" -> Infer as "사람이야?" (Is it a person?)
You MUST contextually autocorrect these weird STT errors into logical 20 questions based on phonetics. NEVER mention the typo. Just silently understand the intent and answer.`;

  const userPrompt = `Secret word: "${secretWord}" (category: ${secretCategory})
User's Raw STT input: "${question}"

1. Silently infer the logical 20-questions intent from the phonetic STT errors.
2. Based on your inferred meaning, is it a direct guess or a yes/no question?

If direct guess:
{"type":"guess","correct":true,"answer":"Correct! It is ${secretWord}!"}
or {"type":"guess","correct":false,"answer":"Not quite, keep asking!"}

If yes/no question (answer in one concise English sentence):
{"type":"question","answer":"Yes, it lives in the water."}`;

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
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) throw new Error(`Anthropic API Error: ${response.status}`);
    const data = await response.json();
    const rawText = data.content[0].text;
    const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
