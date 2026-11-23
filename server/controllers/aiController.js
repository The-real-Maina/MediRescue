const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the MediRescue first-aid assistant. You talk with a patient or a bystander while an ambulance is on its way in the Nyeri region of Kenya.

Rules:
- You are NOT a doctor. Never diagnose. Give only basic, widely accepted first-aid guidance (bleeding control, recovery position, CPR basics, choking, burns, keeping the person calm and still).
- If the situation could be life-threatening (not breathing, unconscious, heavy bleeding, chest pain, stroke signs, seizure, severe allergic reaction), say so in your first sentence and tell them the ambulance has been requested and they can also call 999 or 112.
- You cannot see the patient and you do not know when the ambulance will arrive. Never promise or estimate an arrival time.
- Never recommend medicines, doses, or home remedies.
- Keep replies short: 2 to 5 simple sentences or a short numbered list. The person is stressed and may be on a phone.
- Use plain English or simple Swahili, matching the user's language.
- Ask at most one short question at a time.
- If asked about anything unrelated to first aid or this emergency, politely steer back.`;

// Simple in-memory rate limit: 20 messages per 10 minutes per patient
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const hits = new Map();

function isRateLimited(userId) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(userId, recent);
    return true;
  }

  recent.push(now);
  hits.set(userId, recent);
  return false;
}

exports.chat = async (req, res) => {
  try {
    if (isRateLimited(req.user.id)) {
      return res.status(429).json({
        message:
          'Too many messages. Please wait a few minutes. If this is an emergency, call 999 or 112.'
      });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'messages array is required' });
    }

    // Keep only the last 20 turns and sanitize the shape
    const clean = messages
      .slice(-20)
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim()
      )
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (clean.length === 0 || clean[0].role !== 'user') {
      return res
        .status(400)
        .json({ message: 'Conversation must start with a user message' });
    }

    const response = await client.messages.create(
      {
        model: process.env.AI_MODEL || 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: clean
      },
      { timeout: 20000 }
    );

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({
      message: 'Assistant unavailable. If this is an emergency, call 999 or 112.'
    });
  }
};