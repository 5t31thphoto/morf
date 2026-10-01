import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/expand-BW7cMqsv.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var expandIntentPhrases_createServerFn_handler = createServerRpc({
	id: "db3aef3d13e1cec2ae4b3436488828b8b0b96d8aa68df725ebbb36cabebccd53",
	name: "expandIntentPhrases",
	filename: "src/lib/morf/expand.ts"
}, (opts) => expandIntentPhrases.__executeServer(opts));
var expandIntentPhrases = createServerFn({ method: "POST" }).validator((input) => input).handler(expandIntentPhrases_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "xAI is not available in this environment"
	};
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			max_tokens: 500,
			temperature: .8,
			messages: [{
				role: "system",
				content: "You generate short spoken command paraphrases for a tiny on-device NLU. Return ONLY a JSON array of strings, no markdown. Max 12 phrases. Each phrase under 8 words. No punctuation except apostrophes. Lowercase."
			}, {
				role: "user",
				content: `Intent: ${data.intent}\nExisting: ${data.phrases.slice(0, 8).join(" | ")}\nGenerate 10 new paraphrases a person might actually say.`
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `xAI API error ${res.status}`
	};
	const match = ((await res.json()).choices[0]?.message.content ?? "[]").match(/\[[\s\S]*\]/);
	let phrases = [];
	try {
		phrases = JSON.parse(match?.[0] ?? "[]");
	} catch {
		return {
			ok: false,
			error: "Could not parse paraphrases"
		};
	}
	phrases = phrases.filter((p) => typeof p === "string").map((p) => p.trim().toLowerCase().replace(/[.?!]$/g, "")).filter((p) => p.length > 1 && p.length < 60).slice(0, 12);
	return {
		ok: true,
		phrases
	};
});
//#endregion
export { expandIntentPhrases_createServerFn_handler };
