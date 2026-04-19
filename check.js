export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { secretWord, secretCategory, question } = req.body;
  const API_KEY = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = 'You host 20 Questions. Return raw JSON only, no markdown.';
  const userPrompt = `Secret word: "${secretWord}" (category: ${secretCategory})
Player question: "${question}"

Is this a direct guess or a yes/no question?

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
