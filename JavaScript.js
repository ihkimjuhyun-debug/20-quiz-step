// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

// Claude API 호출 공통 함수
async function callClaude(userPrompt, systemPrompt) {
    const response = await fetch(CLAUDE_URL, {
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

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'API Error');
    }
    const data = await response.json();
    return data.content.map(b => b.type === 'text' ? b.text : '').join('');
}

// 1. 단어 가져오기 API
app.post('/api/get-word', async (req, res) => {
    const { lang } = req.body;
    const systemPrompt = 'Return raw JSON only. No markdown.';
    const userPrompt = lang === 'ko'
        ? `스무고개용 단어 하나. 동물/음식/사물/유명인/장소 중 랜덤으로. 형식: {"word":"고양이","category":"동물"}`
        : `Pick one secret word for 20 Questions. Vary between: animal, food, object, famous person, landmark. Format: {"word":"elephant","category":"animal"}`;

    try {
        const raw = await callClaude(userPrompt, systemPrompt);
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. 질문 답변 API
app.post('/api/check', async (req, res) => {
    const { secretWord, secretCategory, question } = req.body;
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
        const raw = await callClaude(userPrompt, systemPrompt);
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
