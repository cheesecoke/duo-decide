/**
 * linkify — split a line of user text into plain runs and links.
 *
 * Option titles are whatever was typed or pasted, and a lot of them are a
 * name and a pasted URL ("Alexa Sharf: https://www.psychologytoday.com/…").
 * `OptionText` (components/ui/reusables/option-text/) renders each link
 * segment as a short, tappable hostname; this file only finds them.
 *
 * Pure, no React Native, so it is table-tested on its own
 * (__tests__/lib/linkify.test.ts).
 *
 * What counts as a link:
 *
 * - `http://…` and `https://…`, any case, up to the next whitespace.
 * - `www.…`, which opens as `https://www.…`.
 *
 * A bare `example.com` is deliberately *not* a link: "Coffee/Boulder Creek
 * Festival" and "Sam's B.B.Q." would start turning into links too.
 *
 * Trailing punctuation that ends a sentence (`.`, `,`, `!`, `?`, `;`, `:`,
 * quotes) is not part of the link, and neither is a closing bracket that has
 * no opening one inside the URL — so "(see https://a.com/x)" links
 * `https://a.com/x` while "https://en.wikipedia.org/wiki/Foo_(bar)" keeps its
 * own bracket.
 *
 * No `URL` here on purpose: React Native's `URL` polyfill does not implement
 * `hostname`, so the host is read with a regex instead.
 */

export type TextSegment = { type: "text"; text: string };

export type LinkSegment = {
	type: "link";
	/** Exactly as it was written in the title. */
	text: string;
	/** What opens: `text`, with `https://` added in front of a bare `www.`. */
	url: string;
	/** What is shown: the hostname, lower-cased, without a leading `www.`. */
	host: string;
};

export type Segment = TextSegment | LinkSegment;

const LINK = /(?:https?:\/\/|www\.)[^\s<>"]+/gi;

const TRAILING = /[.,!?;:'"’”]$/;

const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function count(text: string, char: string): number {
	return text.split(char).length - 1;
}

/** Drop sentence punctuation and unbalanced closing brackets off the end. */
function trimTail(raw: string): string {
	let link = raw;
	for (;;) {
		const last = link.slice(-1);
		if (TRAILING.test(last)) {
			link = link.slice(0, -1);
			continue;
		}
		const opener = CLOSERS[last];
		if (opener && count(link, last) > count(link, opener)) {
			link = link.slice(0, -1);
			continue;
		}
		return link;
	}
}

/** `https://www.Example.com:8080/a?b` → `example.com`. `null` if there is no host. */
export function hostOf(url: string): string | null {
	const match = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/?#]*@)?([^/?#:]+)/i.exec(url);
	if (!match) return null;
	const host = match[1].toLowerCase().replace(/^www\./, "");
	return host.includes(".") ? host : null;
}

/** Split `text` into text and link segments. Adjacent text is never split in two. */
export function linkify(text: string): Segment[] {
	const segments: Segment[] = [];
	let cursor = 0;

	const pushText = (value: string) => {
		if (!value) return;
		const previous = segments[segments.length - 1];
		if (previous?.type === "text") previous.text += value;
		else segments.push({ type: "text", text: value });
	};

	for (const match of text.matchAll(LINK)) {
		const start = match.index ?? 0;
		const raw = trimTail(match[0]);
		const url = /^www\./i.test(raw) ? `https://${raw}` : raw;
		const host = hostOf(url);

		// "www." on its own, or "https://localhost" — not something to show
		// as a hostname, so it stays text.
		if (!host) continue;

		pushText(text.slice(cursor, start));
		segments.push({ type: "link", text: raw, url, host });
		cursor = start + raw.length;
	}

	pushText(text.slice(cursor));
	return segments;
}

/** Just the links, in order. */
export function linksIn(text: string): LinkSegment[] {
	return linkify(text).filter((segment): segment is LinkSegment => segment.type === "link");
}
