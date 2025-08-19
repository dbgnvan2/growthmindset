// api/coach.js

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || "claude-3-haiku-20240307";
const MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS || 400);
const TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS || 20000); // 20s

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function getJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (req.body && typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch {}
  }
  return {};
}

function sanitizeName(name) {
  if (typeof name !== "string" || !name.trim()) return "";
  const trimmed = name.trim().slice(0, 80);
  return trimmed.replace(/[\r\n\t]+/g, " ");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET")   return res.status(200).json({ ok: true, message: "coach api healthy" });
  if (req.method !== "POST")  return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ error: "Server misconfigured: CLAUDE_API_KEY missing" });
    }

    const ct = (req.headers["content-type"] || "").toLowerCase();
    if (!ct.startsWith("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }

    const { userInput, conversationContext, name } = getJsonBody(req);

    if (!userInput || typeof userInput !== "string") {
      return res.status(400).json({ error: "userInput (string) is required" });
    }

    const safeUserInput = userInput.length > 2000 ? userInput.slice(0, 2000) + " …[truncated]" : userInput;
    const safeContext =
      typeof conversationContext === "string" && conversationContext.length
        ? (conversationContext.length > 4000
            ? conversationContext.slice(0, 4000) + " …[truncated]"
            : conversationContext)
        : "";

    const safeName = sanitizeName(name || "");

    const nameLine = safeName
      ? `Address the user by name (${safeName}) at least once in a natural way in the opening sentence.`
      : `If a name is not provided, do not invent one.`;

    // === UPDATED PROMPT (no subheadings; weave keywords into prose) ===
const prompt = `You are a skilled coach using Carol Dweck's "growth mindset" principles and Socratic dialogue methods. Your goal is to help users discover insights through thoughtful questioning rather than just giving advice.

User's name: ${safeName || "(not provided)"}
User's current challenge: "${safeUserInput}"

Write a supportive, concise reply in exactly four short paragraphs. 
- Each paragraph must be separated by a blank line (double line break).
- Do NOT use markdown formatting, lists, bold text, or section labels. 
- Use only plain text paragraphs.

Structure:
1) Acknowledge: Begin by briefly validating their feeling with empathy. If a name is provided, start the first sentence by addressing the user directly by name (e.g., "Dave, I can understand…"). 
2) Explore: In the second paragraph, include reflective questions that help them think differently. Explicitly weave in the word "explore" or a synonym such as "look at", "consider", or "examine". 
3) Action: In the third paragraph, suggest exactly one small, specific next step. Naturally include action language such as "try", "experiment with", or "practice". 
4) Reframe: In the final paragraph, end with a growth-mindset reframing. Use natural cues such as "another way to look at this is…", "you might reframe this as…", or "what might change if…".

Guidelines:
- Keep it conversational and human-sounding.
- Ask questions that challenge assumptions or explore different perspectives.
- Help them discover their own insights rather than telling them what to think.
- Keep the total length under 200 words.
${safeContext ? "\nPrevious conversation context: " + safeContext : ""}

Return only the four paragraphs of text.`;

// end prompt ******************************************

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    }).catch((err) => {
      throw new Error(`Network/timeout error: ${err.message}`);
    });

    clearTimeout(t);

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => "");
      return res
        .status(apiRes.status)
        .json({ error: "Claude API error", status: apiRes.status, details: text.slice(0, 1000) });
    }

    const data = await apiRes.json();
    const responseText =
      data && data.content && Array.isArray(data.content) && data.content[0]?.text
        ? String(data.content[0].text).trim()
        : "";

    if (!responseText) {
      return res.status(502).json({ error: "Claude API returned an empty response" });
    }

    return res.status(200).json({ response: responseText });
  } catch (err) {
    const message = err?.message || "Unknown error";
    const status = /aborted|AbortError/i.test(message) ? 504 : 500;
    return res.status(status).json({ error: "Failed to get coaching response", details: message });
  }
}
