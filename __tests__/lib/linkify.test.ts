import { hostOf, linkify, linksIn, type Segment } from "@/lib/linkify";

const text = (value: string): Segment => ({ type: "text", text: value });
const link = (value: string, url: string, host: string): Segment => ({
	type: "link",
	text: value,
	url,
	host,
});

describe("linkify", () => {
	it.each<[string, string, Segment[]]>([
		["plain text", "Tacos", [text("Tacos")]],
		["empty", "", []],
		[
			"a slash is not a link",
			"Coffee/Boulder Creek Festival - recreate our date.",
			[text("Coffee/Boulder Creek Festival - recreate our date.")],
		],
		["a bare domain is not a link", "Dinner at example.com", [text("Dinner at example.com")]],
		[
			"a name and a pasted link",
			"Alexa Sharf: https://www.psychologytoday.com/us/therapists/alexa-sharf-boulder-co/1234567",
			[
				text("Alexa Sharf: "),
				link(
					"https://www.psychologytoday.com/us/therapists/alexa-sharf-boulder-co/1234567",
					"https://www.psychologytoday.com/us/therapists/alexa-sharf-boulder-co/1234567",
					"psychologytoday.com",
				),
			],
		],
		[
			"a link on its own",
			"https://secure.helloalma.com/providers/hazel-patel/",
			[
				link(
					"https://secure.helloalma.com/providers/hazel-patel/",
					"https://secure.helloalma.com/providers/hazel-patel/",
					"secure.helloalma.com",
				),
			],
		],
		[
			"http, upper case, with a port",
			"See HTTP://Example.COM:8080/a?b=c#d now",
			[
				text("See "),
				link("HTTP://Example.COM:8080/a?b=c#d", "HTTP://Example.COM:8080/a?b=c#d", "example.com"),
				text(" now"),
			],
		],
		[
			"www. opens over https",
			"Try www.yelp.com/biz/foo",
			[text("Try "), link("www.yelp.com/biz/foo", "https://www.yelp.com/biz/foo", "yelp.com")],
		],
		[
			"a full stop ends the sentence, not the link",
			"Book at https://opentable.com/r/x.",
			[
				text("Book at "),
				link("https://opentable.com/r/x", "https://opentable.com/r/x", "opentable.com"),
				text("."),
			],
		],
		[
			"an unbalanced bracket is not part of the link",
			"(see https://a.com/x)",
			[text("(see "), link("https://a.com/x", "https://a.com/x", "a.com"), text(")")],
		],
		[
			"a balanced bracket is",
			"https://en.wikipedia.org/wiki/Foo_(bar)",
			[
				link(
					"https://en.wikipedia.org/wiki/Foo_(bar)",
					"https://en.wikipedia.org/wiki/Foo_(bar)",
					"en.wikipedia.org",
				),
			],
		],
		[
			"two links",
			"https://a.com or https://b.org, either",
			[
				link("https://a.com", "https://a.com", "a.com"),
				text(" or "),
				link("https://b.org", "https://b.org", "b.org"),
				text(", either"),
			],
		],
		[
			"no host to show stays text",
			"http://localhost:3000 www.",
			[text("http://localhost:3000 www.")],
		],
	])("%s", (_name, input, expected) => {
		expect(linkify(input)).toEqual(expected);
	});

	it("loses no characters", () => {
		const input = "A: https://x.com/a, B: www.y.org/b. (C: http://z.net/c)";
		expect(
			linkify(input)
				.map((segment) => segment.text)
				.join(""),
		).toBe(input);
	});
});

describe("hostOf", () => {
	it.each([
		["https://www.psychologytoday.com/us", "psychologytoday.com"],
		["https://user:pw@Sub.Example.co.uk:443/x", "sub.example.co.uk"],
		["https://localhost", null],
		["not a url", null],
	])("%s → %s", (url, host) => {
		expect(hostOf(url)).toBe(host);
	});
});

describe("linksIn", () => {
	it("returns only the links, in order", () => {
		expect(linksIn("a https://a.com b www.b.com").map((segment) => segment.host)).toEqual([
			"a.com",
			"b.com",
		]);
	});
});
