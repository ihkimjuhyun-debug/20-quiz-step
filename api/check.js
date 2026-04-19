export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { secretWord, secretCategory, question } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  // STT 유연성 및 문맥 추론을 위한 프롬프트 강화
  const systemPrompt = 'You are a smart host for 20 Questions. Return raw JSON only, no markdown. You must be highly tolerant of typos, phonetic errors, and grammatical mistakes because the user\'s input comes from a Speech-to-Text (STT) engine. Always try to infer the user\'s actual intent based on the secret word.';
  const userPrompt = `Secret word: "${secretWord}" (category: ${secretCategory})
Player question (transcribed via STT, might contain weird errors): "${question}"

First, quietly infer what the player actually meant to ask, ignoring STT misrecognitions.
Then, answer based on your inferred meaning. Is it a direct guess or a yes/no question?

If guess:
{"type":"guess","correct":true,"answer":"Correct! It is ${secretWord}!"}
or {"type":"guess","correct":false,"answer":"Not quite, keep asking!"}

If yes/no — answer in one concise English sentence:
{"type":"question","answer":"Yes, it is an animal."}`;

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
        max_tokens: 100,
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
