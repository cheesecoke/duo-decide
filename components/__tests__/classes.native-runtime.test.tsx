import fs from "fs";
import path from "path";
import selectorParser from "postcss-selector-parser";
import postcss from "postcss";
import ts from "typescript";

import { compileNativeCss, type NativeRule } from "@/test-utils/native-css";

/**
 * Every class the app uses has to *do something* on iOS.
 *
 * Tailwind is compiled for iOS the way Metro does it (test-utils/native-css.ts:
 * the repo's own config and content globs, `NATIVEWIND_OS=ios`, the same
 * `cssToReactNativeRuntime` options and rem), and each generated class the
 * source uses must come out as a native rule that:
 *
 * 1. exists, and sets something (or is a `group` container);
 * 2. carries no warnings — NativeWind warns and drops a property or value
 *    native has no equivalent of (`display: grid`, `white-space`, `outline`);
 * 3. keeps its condition — a `focus-visible:` or `first:` class whose
 *    pseudo-class native cannot match compiles with empty `pseudoClasses` and
 *    then applies *always*, which is worse than not at all.
 *
 * Web-only classes are fine inside a web branch (`Platform.select({ web })`,
 * which the scanner cannot tell apart from a native one): those are
 * `WEB_ONLY_ALLOWED` below, and each entry says where it lives. A `web:`
 * prefix needs no entry: with `NATIVEWIND_OS=ios` it is not generated at all.
 *
 * "Uses" means the class appears in a class string in shipping source (not a
 * story, not a test): a `className`-style JSX attribute, a `*ClassContext`
 * value, an argument to cn/cva/clsx/twMerge or a string in a
 * `Platform.select`, a `*class*` constant, or any
 * string made only of generated classes. Tailwind's scanner also generates
 * classes for English words in comments and prop values ("block", "inline",
 * "outline"); those never reach a view, so they are not checked.
 *
 * eslint.config.js (`NATIVE_SAFE_SYNTAX`) is the other half: it catches the
 * same patterns by spelling, before anything is compiled.
 */

const ROOT = path.resolve(__dirname, "../..");

type Allowed = { pattern: RegExp; where: string };

/** Web-only classes the app uses on purpose, each inside a web branch. */
const WEB_ONLY_ALLOWED: Allowed[] = [
	{ pattern: /^whitespace-nowrap$/, where: "button.tsx base, Platform.select web" },
	{ pattern: /^text-balance$/, where: "text.tsx h1, Platform.select web" },
	{ pattern: /^\[overflow-wrap:anywhere\]$/, where: "text.tsx WRAP_ANYWHERE, web only" },
	{ pattern: /^\[&_svg.*\]:/, where: "button.tsx base, Platform.select web" },
	{ pattern: /^has-\[>svg\]:/, where: "button.tsx sizes, Platform.select web" },
	{ pattern: /^first:mt-0$/, where: "text.tsx h2, Platform.select web" },
	{ pattern: /^focus-visible:/, where: "button.tsx base and destructive, Platform.select web" },
	{ pattern: /^transition/, where: "button.tsx base and text, Platform.select web" },
	{ pattern: /^outline/, where: "button.tsx base, Platform.select web" },
	{ pattern: /^underline-offset-/, where: "button.tsx link text, Platform.select web" },
	{ pattern: /^scroll-m-20$/, where: "text.tsx h1–h4, Platform.select web" },
	{ pattern: /^break-inside-avoid$/, where: "stagger-in.tsx, Platform.select web (masonry)" },
	{ pattern: /^group$/, where: "button.tsx base (group-active: on native)" },
];

/** tailwind.config.js `content`, minus what never ships to a phone. */
const SOURCE_DIRS = [
	"app",
	"components",
	"theme",
	"hooks",
	"lib",
	"context",
	"constants",
	"config",
	"data",
];
const NOT_SHIPPED = /(\.stories\.|__tests__|\.test\.)/;

function sourceFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(full);
		return /\.(t|j)sx?$/.test(entry.name) && !NOT_SHIPPED.test(full) ? [full] : [];
	});
}

/** Class tokens in class strings, each with the first file that uses it. */
function classesUsedInSource(generated: Set<string>): Map<string, string> {
	const used = new Map<string, string>();
	for (const file of SOURCE_DIRS.flatMap((dir) => sourceFiles(path.join(ROOT, dir)))) {
		const kind = /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
		const sf = ts.createSourceFile(
			file,
			fs.readFileSync(file, "utf8"),
			ts.ScriptTarget.Latest,
			true,
			kind,
		);

		const inClassContext = (node: ts.Node) => {
			// A string branch of `Platform.select({ web: "…" })` is a class
			// string (a style branch would be an object).
			const branch = node.parent;
			if (
				ts.isPropertyAssignment(branch) &&
				ts.isObjectLiteralExpression(branch.parent) &&
				ts.isCallExpression(branch.parent.parent) &&
				branch.parent.parent.expression.getText(sf) === "Platform.select"
			) {
				return true;
			}
			for (let p = node.parent; p; p = p.parent) {
				if (ts.isJsxAttribute(p)) {
					const name = p.name.getText(sf);
					if (/className$/i.test(name)) return true;
					const tag = p.parent.parent;
					return (
						name === "value" &&
						(ts.isJsxOpeningElement(tag) || ts.isJsxSelfClosingElement(tag)) &&
						/ClassContext\.Provider$/.test(tag.tagName.getText(sf))
					);
				}
				if (ts.isCallExpression(p) && /^(cn|cva|clsx|twMerge)$/.test(p.expression.getText(sf))) {
					return true;
				}
				if (ts.isVariableDeclaration(p)) return /class/i.test(p.name.getText(sf));
				if (ts.isPropertyAssignment(p) && /className$/i.test(p.name.getText(sf))) return true;
				if (ts.isFunctionLike(p)) return false;
			}
			return false;
		};

		const visit = (node: ts.Node) => {
			if (
				ts.isStringLiteral(node) ||
				ts.isNoSubstitutionTemplateLiteral(node) ||
				ts.isTemplateHead(node) ||
				ts.isTemplateMiddle(node) ||
				ts.isTemplateTail(node)
			) {
				const tokens = node.text.split(/\s+/).filter(Boolean);
				const allClasses = tokens.length > 1 && tokens.every((t) => generated.has(t));
				if (allClasses || inClassContext(node)) {
					for (const token of tokens) {
						if (!used.has(token)) used.set(token, path.relative(ROOT, file));
					}
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(sf);
	}
	return used;
}

type Finding = { className: string; problem: string };

/** Every generated class whose native rule is missing, warned or unconditional. */
function nativeFindings(css: string, rules: Record<string, NativeRule>): Finding[] {
	const findings = new Map<string, string>();
	const flag = (className: string, problem: string) => {
		if (!findings.has(className)) findings.set(className, problem);
	};

	postcss.parse(css).walkRules((rule) => {
		if (rule.parent?.type === "atrule" && /keyframes/.test((rule.parent as postcss.AtRule).name)) {
			return;
		}
		selectorParser((selectors) => {
			selectors.each((selector) => {
				const classes: selectorParser.ClassName[] = [];
				selector.walkClasses((node) => {
					classes.push(node);
				});
				const target = classes[classes.length - 1];
				if (!target) return;

				// The conditions on the target's own compound (after the last
				// combinator); a `group-*:` condition sits on the group's.
				let start = selector.nodes.length - 1;
				while (start >= 0 && selector.nodes[start].type !== "combinator") start--;
				const compound = selector.nodes.slice(start + 1);
				const conditions = compound.filter(
					(n) => (n.type === "pseudo" && !n.value.startsWith("::")) || n.type === "attribute",
				);

				const name = target.value;
				const native = rules[name];
				if (!native) return flag(name, "no native rule");
				if (native.warnings?.length) {
					const what = native.warnings.map((w) => (w.value ? `${w.property}: ${w.value}` : w.property));
					return flag(name, `dropped on native (${what.join(", ")})`);
				}
				const entries = native.n ?? [];
				if (!native.container && !entries.some((e) => e.d?.length || e.variables?.length)) {
					return flag(name, "sets nothing on native");
				}
				const keepsCondition = entries.some(
					(e) =>
						(e.pseudoClasses && Object.keys(e.pseudoClasses).length > 0) ||
						(e.attrs && e.attrs.length > 0) ||
						(e.containerQuery && e.containerQuery.length > 0),
				);
				if (conditions.length && !keepsCondition) {
					flag(name, `applies unconditionally: ${conditions.map(String).join("")} is dropped`);
				}
			});
		}).processSync(rule.selector);
	});

	return [...findings].map(([className, problem]) => ({ className, problem }));
}

let findings: Finding[];
let used: Map<string, string>;

beforeAll(async () => {
	const { css, rules } = await compileNativeCss();
	const generated = new Set<string>();
	postcss.parse(css).walkRules((rule) => {
		selectorParser((selectors) =>
			selectors.walkClasses((node) => void generated.add(node.value)),
		).processSync(rule.selector);
	});
	used = classesUsedInSource(generated);
	findings = nativeFindings(css, rules);
}, 30_000);

const allowed = (className: string) =>
	WEB_ONLY_ALLOWED.some(({ pattern }) => pattern.test(className));

describe("Tailwind classes on iOS", () => {
	it("compiles every class the app uses to a native rule that works", () => {
		const broken = findings
			.filter(({ className }) => used.has(className) && !allowed(className))
			.map(({ className, problem }) => `${className} (${used.get(className)}): ${problem}`);

		// A class here does nothing on iOS, or does it unconditionally. Scope
		// it to the web (`web:` or Platform.select({ web })) and, if it lives
		// in a web branch, add it to WEB_ONLY_ALLOWED with where it lives.
		expect(broken).toEqual([]);
	});

	it("keeps WEB_ONLY_ALLOWED to classes the app still uses", () => {
		const stale = WEB_ONLY_ALLOWED.filter(
			({ pattern }) => ![...used.keys()].some((className) => pattern.test(className)),
		).map(({ pattern }) => String(pattern));

		expect(stale).toEqual([]);
	});

	it("flags what it should and nothing else (the check is not vacuous)", async () => {
		const probe = [
			"grid",
			"focus-visible:ring-[3px]",
			"web:grid",
			"h-9",
			"active:opacity-50",
			"group",
		];
		const { css, rules } = await compileNativeCss({ content: [{ raw: probe.join(" ") }] });
		const problems = Object.fromEntries(
			nativeFindings(css, rules)
				.filter((f) => probe.includes(f.className))
				.map((f) => [f.className, f.problem]),
		);

		expect(problems).toEqual({
			grid: expect.stringMatching(/dropped on native/),
			"focus-visible:ring-[3px]": expect.stringMatching(/applies unconditionally/),
		});
	});
});
