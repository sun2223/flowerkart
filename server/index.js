import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || '*';

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '10mb' }));

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

function buildSummarizationPrompt(customPrompt) {
  const defaultPrompt = `Summarize the meeting transcript into:
- Key points
- Decisions made
- Action items with owners and due dates if present
- Risks or blockers
Keep it concise, structured, and readable.`;
  return customPrompt && customPrompt.trim().length > 0 ? customPrompt : defaultPrompt;
}

app.post('/generate-summary', async (req, res) => {
  try {
    if (!openaiClient) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set on the server.' });
    }

    const { transcript, prompt } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return res.status(400).json({ error: 'transcript is required as a non-empty string' });
    }

    const effectivePrompt = buildSummarizationPrompt(prompt);

    const systemMessage = {
      role: 'system',
      content: 'You are an expert meeting notes summarizer. Produce clear, structured summaries that capture key points, decisions, action items (with owners and dates if present), and risks. Use concise language.'
    };

    const userMessage = {
      role: 'user',
      content: `Instruction:\n${effectivePrompt}\n\nTranscript:\n${transcript}`
    };

    let summaryText = '';

    try {
      // Prefer chat.completions; fall back to responses if unavailable
      const completion = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [systemMessage, userMessage],
        temperature: 0.3,
        max_tokens: 800
      });
      summaryText = completion.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
      // Attempt fallback via Responses API
      const response = await openaiClient.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: `Instruction:\n${effectivePrompt}\n\nTranscript:\n${transcript}`,
        temperature: 0.3,
        max_output_tokens: 800
      });
      summaryText = response.output_text?.trim() || '';
    }

    if (!summaryText) {
      return res.status(502).json({ error: 'Model returned empty summary' });
    }

    return res.json({ summary: summaryText });
  } catch (error) {
    console.error('Error in /generate-summary:', error);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
});

async function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
}

app.post('/send-summary', async (req, res) => {
  try {
    const { summary, toEmail } = req.body || {};

    if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
      return res.status(400).json({ error: 'summary is required as a non-empty string' });
    }
    if (!toEmail || typeof toEmail !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail)) {
      return res.status(400).json({ error: 'toEmail must be a valid email address' });
    }

    const transporter = await getTransport();

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'AI Meeting Notes <no-reply@example.com>',
      to: toEmail,
      subject: 'Meeting Summary',
      text: summary,
      html: `<pre style="white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace">${
        summary.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
      }</pre>`
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    return res.json({ ok: true, messageId: info.messageId, previewUrl });
  } catch (error) {
    console.error('Error in /send-summary:', error);
    return res.status(500).json({ error: 'Failed to send summary email' });
  }
});

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'AI Meeting Notes API', endpoints: ['/generate-summary', '/send-summary'] });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});