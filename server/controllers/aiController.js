const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';

const HAS_KEY = Boolean(
  process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()
);

// Shows in the Render Logs tab after each deploy.
console.log(
  'First-aid chat mode:',
  HAS_KEY ? `AI (${MODEL})` : 'built-in guide (no ANTHROPIC_API_KEY set)'
);

let client = null;

function getClient() {
  if (!HAS_KEY) return null;

  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY.trim()
    });
  }

  return client;
}

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

// ==========================================
// BUILT-IN FIRST-AID GUIDE (no API key needed)
// Basic, widely accepted first aid only.
// Rules are checked in order: most urgent first.
// ==========================================

const CALL_LINE =
  'Your ambulance has been requested. You can also call 999 or 112.';

const GUIDE = [
  {
    // Not breathing / unconscious
    test: /(not breathing|stopped breathing|no breath|unconscious|unresponsive|collapsed|no pulse|cardiac arrest|heart stopped|kuzimia|hapumui)/,
    reply:
      'This may be life-threatening. ' + CALL_LINE + '\n\n' +
      '1. Lay the person flat on their back on a firm surface.\n' +
      '2. Push hard and fast in the centre of the chest, about 100 to 120 pushes a minute, letting the chest rise fully each time.\n' +
      '3. Keep going until help arrives or the person starts breathing.\n\n' +
      'Is the person breathing right now?'
  },
  {
    // Choking
    test: /(chok|can'?t breathe|cannot breathe|can'?t speak|something stuck in (his|her|the) throat|kusongwa)/,
    reply:
      'Choking can be life-threatening. ' + CALL_LINE + '\n\n' +
      '1. If they can cough, encourage them to keep coughing.\n' +
      '2. If they cannot cough, speak or breathe, give 5 firm back blows between the shoulder blades.\n' +
      '3. Then give 5 abdominal thrusts (stand behind, fist above the belly button, pull inward and up).\n' +
      '4. Repeat until it clears or they become unresponsive, then start chest pushes.\n\n' +
      'For a baby under 1 year, give 5 back blows and 5 chest thrusts, never abdominal thrusts.'
  },
  {
    // Stroke
    test: /(stroke|face (is )?droop|drooping|slurred|can'?t speak properly|one side (of the body )?(weak|numb)|arm (is )?weak)/,
    reply:
      'These can be signs of a stroke. ' + CALL_LINE + '\n\n' +
      '1. Note the time the signs started.\n' +
      '2. Help the person lie down with the head slightly raised.\n' +
      '3. Give nothing to eat or drink.\n' +
      '4. Stay with them and keep them calm.\n\n' +
      'When did it start?'
  },
  {
    // Chest pain / heart attack
    test: /(chest pain|heart attack|chest (is )?(tight|heavy)|pain in (the )?chest)/,
    reply:
      'Chest pain can be life-threatening. ' + CALL_LINE + '\n\n' +
      '1. Help the person sit down and rest in a comfortable position.\n' +
      '2. Loosen tight clothing.\n' +
      '3. Do not let them walk around or exert themselves.\n' +
      '4. Stay with them and keep them calm.\n\n' +
      'Is the person conscious and breathing normally?'
  },
  {
    // Seizure
    test: /(seizure|convuls|fitting|epilep|kifafa)/,
    reply:
      'A seizure can be frightening. ' + CALL_LINE + '\n\n' +
      '1. Move hard or sharp objects away and cushion the head.\n' +
      '2. Do not hold them down and do not put anything in their mouth.\n' +
      '3. Note when it started.\n' +
      '4. When the shaking stops, gently roll them onto their side.\n\n' +
      'How long has it been going on?'
  },
  {
    // Severe allergic reaction
    test: /(allerg|anaphyla|swollen (face|lips|tongue|throat)|swelling of (the )?(face|lips|tongue|throat))/,
    reply:
      'A severe allergic reaction can be life-threatening. ' + CALL_LINE + '\n\n' +
      '1. Help the person sit or lie in the position that is easiest for them to breathe.\n' +
      '2. If they have their own prescribed emergency injector, help them use it exactly as the label says.\n' +
      '3. Stay with them and watch their breathing.\n\n' +
      'Are they having trouble breathing?'
  },
  {
    // Snake bite
    test: /(snake|nyoka)/,
    reply:
      'A snake bite needs hospital care. ' + CALL_LINE + '\n\n' +
      '1. Keep the person calm and as still as possible.\n' +
      '2. Keep the bitten limb still, at or below heart level.\n' +
      '3. Remove rings, watches and tight clothing near the bite.\n' +
      '4. Do not cut the bite, suck it, or apply ice or a tight tourniquet.\n\n' +
      'Where on the body was the person bitten?'
  },
  {
    // Poisoning
    test: /(poison|swallowed|drank|overdose|ingested|sumu)/,
    reply:
      'Poisoning needs urgent help. ' + CALL_LINE + '\n\n' +
      '1. Do not make the person vomit.\n' +
      '2. Keep the container or label to show the medical team.\n' +
      '3. Note what was taken, how much, and when.\n' +
      '4. If they become drowsy, lay them on their side.\n\n' +
      'Do you know what they swallowed?'
  },
  {
    // Nosebleed (before generic bleeding)
    test: /(nose ?bleed|bleeding (from )?(the |his |her )?nose|nose (is )?bleeding|nosebleed)/,
    reply:
      'For a nosebleed:\n\n' +
      '1. Sit upright and lean slightly forward. Do not tilt the head back.\n' +
      '2. Pinch the soft part of the nose, just below the bone, firmly for 10 minutes without letting go.\n' +
      '3. Breathe through the mouth and spit out any blood.\n\n' +
      'If it is still bleeding after 20 minutes, or followed a blow to the head, tell the ambulance crew. ' + CALL_LINE
  },
  {
    // Severe bleeding / cuts
    test: /(bleed|blood|cut |cut himself|cut herself|stab|panga|machete|knife|wound|damu|kukatwa)/,
    reply:
      'Heavy bleeding can be life-threatening. ' + CALL_LINE + '\n\n' +
      '1. Press firmly and directly on the wound with a clean cloth.\n' +
      '2. Do not lift the cloth to check. If blood soaks through, add more cloth on top and keep pressing.\n' +
      '3. Help the person lie down and keep them warm.\n' +
      '4. If a limb is bleeding and not broken, raise it above the heart.\n\n' +
      'Where is the bleeding coming from?'
  },
  {
    // Burns
    test: /(burn|scald|boiling|fire|moto|kuungua)/,
    reply:
      'For a burn:\n\n' +
      '1. Cool the burn under cool running water for 20 minutes.\n' +
      '2. Gently remove rings and loose clothing near it, unless stuck to the skin.\n' +
      '3. Cover loosely with a clean, non-fluffy cover such as cling film or a clean cloth.\n' +
      '4. Do not use ice, butter, toothpaste or burst any blisters.\n\n' +
      'Large, deep or facial burns need urgent care. ' + CALL_LINE
  },
  {
    // Head injury
    test: /(head injury|hit (his|her|the) head|hit my head|fell on (his|her|the) head|blow to the head|head trauma)/,
    reply:
      'A head injury needs checking. ' + CALL_LINE + '\n\n' +
      '1. Keep the person still and calm.\n' +
      '2. If there is bleeding, press gently with a clean cloth.\n' +
      '3. Watch for drowsiness, confusion, vomiting or unequal pupils, and tell the ambulance crew.\n' +
      '4. Do not give food or drink.\n\n' +
      'Is the person awake and talking?'
  },
  {
    // Fracture
    test: /(broken|fracture|bone|can'?t move (his|her|the) (leg|arm)|twisted)/,
    reply:
      'For a suspected broken bone:\n\n' +
      '1. Keep the person still and do not try to straighten the limb.\n' +
      '2. Support the injured part in the position you found it, using padding such as folded cloth.\n' +
      '3. Do not let them stand or walk on it.\n' +
      '4. Keep them warm and calm.\n\n' +
      CALL_LINE
  },
  {
    // Fainting
    test: /(faint|dizzy|passed out|black(ed)? out)/,
    reply:
      'For someone who has fainted or feels faint:\n\n' +
      '1. Lay them flat and raise their legs about 30 cm.\n' +
      '2. Loosen tight clothing and give fresh air.\n' +
      '3. Check that they are breathing.\n' +
      '4. If they do not wake within a minute, or are not breathing normally, call 999 or 112 straight away.\n\n' +
      CALL_LINE
  }
];

const DEFAULT_REPLY =
  CALL_LINE + '\n\n' +
  '1. Stay calm and stay with the patient.\n' +
  '2. Do not move them unless they are in danger.\n' +
  '3. Check that they are awake and breathing.\n' +
  '4. Keep them warm and still.\n\n' +
  'Tell me what is happening, for example bleeding, burns, choking, a fall, or a seizure, and I will guide you.';

function builtInReply(messages) {
  // Use the latest message first; fall back to the whole conversation.
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const latest = (lastUser ? lastUser.content : '').toLowerCase();
  const all = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();

  const rule =
    GUIDE.find((r) => r.test.test(latest)) ||
    GUIDE.find((r) => r.test.test(all));

  return rule ? rule.reply : DEFAULT_REPLY;
}

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

    const ai = getClient();

    // No key set: answer from the built-in guide.
    if (!ai) {
      return res.json({ reply: builtInReply(clean), source: 'builtin' });
    }

    try {
      const response = await ai.messages.create(
        {
          model: MODEL,
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

      return res.json({ reply, source: 'ai' });
    } catch (aiError) {
      // AI unavailable (no credit, network, etc.): fall back to the guide.
      console.error('AI chat error (using built-in guide):', aiError.message);
      return res.json({ reply: builtInReply(clean), source: 'builtin' });
    }
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({
      message: 'Assistant unavailable. If this is an emergency, call 999 or 112.'
    });
  }
};