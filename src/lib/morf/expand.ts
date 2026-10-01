import { createServerFn } from "@tanstack/react-start";

export const expandIntentPhrases = createServerFn({ method: "POST" })
  .validator((input: { intent: string; phrases: string[] }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "xAI is not available in this environment" };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 500,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "You generate short spoken command paraphrases for a tiny on-device NLU. Return ONLY a JSON array of strings, no markdown. Max 12 phrases. Each phrase under 8 words. No punctuation except apostrophes. Lowercase.",
          },
          {
            role: "user",
            content: `Intent: ${data.intent}\nExisting: ${data.phrases.slice(0, 8).join(" | ")}\nGenerate 10 new paraphrases a person might actually say.`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI API error ${res.status}` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const text = body.choices[0]?.message.content ?? "[]";
    const match = text.match(/\[[\s\S]*\]/);
    let phrases: string[] = [];
    try {
      phrases = JSON.parse(match?.[0] ?? "[]") as string[];
    } catch {
      return { ok: false as const, error: "Could not parse paraphrases" };
    }
    phrases = phrases
      .filter((p) => typeof p === "string")
      .map((p) => p.trim().toLowerCase().replace(/[.?!]$/g, ""))
      .filter((p) => p.length > 1 && p.length < 60)
      .slice(0, 12);
    return { ok: true as const, phrases };
  });
