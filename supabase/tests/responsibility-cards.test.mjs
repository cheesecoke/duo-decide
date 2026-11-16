// Migration 025 (responsibility cards) on the real schema: every migration
// applied to PGlite (all-migrations.mjs), then the Cards tab's reads and
// writes run through RLS as the signed-in user. `npm run test:sql`.
import assert from "node:assert/strict";
import fs from "node:fs";

import { MIGRATIONS, asAdmin, asUser, migratedDb } from "./all-migrations.mjs";

const A = "00000000-0000-0000-0000-0000000000a1";
const B = "00000000-0000-0000-0000-0000000000b2";
const OUTSIDER = "00000000-0000-0000-0000-0000000000c3";
const COUPLE = "c0000000-0000-0000-0000-000000000025";
const OTHER_COUPLE = "c0000000-0000-0000-0000-000000000099";

/** The Cards tab's read (lib/database.ts getResponsibilityCards). */
const CARDS = `SELECT title, holder_id FROM public.responsibility_cards WHERE couple_id='${COUPLE}' AND removed_at IS NULL ORDER BY title`;

const rows = async (db, q) => (await db.query(q)).rows;
const n = async (db, q) => Number((await db.query(q)).rows[0].n);

async function fresh({ linked = true } = {}) {
	const db = await migratedDb();
	await db.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${A}','a@x.com'),('${B}','b@x.com'),('${OUTSIDER}','c@x.com');
    INSERT INTO public.couples (id, user1_id, user2_id) VALUES
      ('${COUPLE}','${A}',${linked ? `'${B}'` : "NULL"}),
      ('${OTHER_COUPLE}','${OUTSIDER}',NULL);
    UPDATE public.profiles SET couple_id='${COUPLE}' WHERE id IN ('${A}'${linked ? `,'${B}'` : ""});
    UPDATE public.profiles SET couple_id='${OTHER_COUPLE}' WHERE id='${OUTSIDER}';
    INSERT INTO public.responsibility_cards (couple_id, title, category, daily, deck_key, holder_id) VALUES
      ('${COUPLE}','Trash & recycling','home',true,'trash','${A}'),
      ('${COUPLE}','Car','out',false,'car',NULL);
  `);
	return db;
}

let passed = 0;
async function test(name, fn) {
	await fn();
	passed++;
	console.log("  ✓", name);
}

console.log(`responsibility cards (${MIGRATIONS[0]} → ${MIGRATIONS.at(-1)})`);

await test("025 applies to a fresh database and can run twice", async () => {
	assert.ok(MIGRATIONS.includes("025_responsibility_cards.sql"));
	const db = await migratedDb();
	await db.exec(
		fs.readFileSync(new URL("../migrations/025_responsibility_cards.sql", import.meta.url), "utf8"),
	);
	assert.equal(
		await n(
			db,
			"SELECT count(*)::int AS n FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='responsibility_cards'",
		),
		1,
	);
});

await test("both partners see the couple's cards; an outsider and a signed-out caller see none", async () => {
	const db = await fresh();
	await asUser(db, A);
	assert.equal((await rows(db, CARDS)).length, 2);
	await asUser(db, B);
	assert.equal((await rows(db, CARDS)).length, 2);
	await asUser(db, OUTSIDER);
	assert.equal((await rows(db, CARDS)).length, 0);
	await asUser(db, null);
	await assert.rejects(db.query(CARDS));
});

await test("either partner can deal a card to either of them, or put it back", async () => {
	const db = await fresh();
	await asUser(db, B);
	await db.exec(
		`UPDATE public.responsibility_cards SET holder_id='${B}' WHERE couple_id='${COUPLE}' AND deck_key='trash'`,
	);
	await db.exec(
		`UPDATE public.responsibility_cards SET holder_id='${A}' WHERE couple_id='${COUPLE}' AND deck_key='car'`,
	);
	assert.deepEqual(await rows(db, CARDS), [
		{ title: "Car", holder_id: A },
		{ title: "Trash & recycling", holder_id: B },
	]);
	await db.exec(
		`UPDATE public.responsibility_cards SET holder_id=NULL WHERE couple_id='${COUPLE}' AND deck_key='car'`,
	);
	assert.equal((await rows(db, CARDS))[0].holder_id, null);
});

await test("a card cannot be dealt to someone outside the couple", async () => {
	const db = await fresh();
	await asUser(db, A);
	await assert.rejects(
		db.exec(
			`UPDATE public.responsibility_cards SET holder_id='${OUTSIDER}' WHERE couple_id='${COUPLE}' AND deck_key='car'`,
		),
	);
	await assert.rejects(
		db.exec(
			`INSERT INTO public.responsibility_cards (couple_id, title, holder_id) VALUES ('${COUPLE}','Taxes','${OUTSIDER}')`,
		),
	);
});

await test("an outsider cannot add to, change or move a couple's cards", async () => {
	const db = await fresh();
	await asUser(db, OUTSIDER);
	await assert.rejects(
		db.exec(
			`INSERT INTO public.responsibility_cards (couple_id, title) VALUES ('${COUPLE}','Sneaky')`,
		),
	);
	await db.exec(
		`UPDATE public.responsibility_cards SET title='Hacked', holder_id=NULL WHERE couple_id='${COUPLE}'`,
	);
	// A member cannot move a card into another couple either.
	await asUser(db, A);
	await assert.rejects(
		db.exec(
			`UPDATE public.responsibility_cards SET couple_id='${OTHER_COUPLE}' WHERE couple_id='${COUPLE}' AND deck_key='car'`,
		),
	);
	await asAdmin(db);
	assert.deepEqual(await rows(db, CARDS), [
		{ title: "Car", holder_id: null },
		{ title: "Trash & recycling", holder_id: A },
	]);
});

await test("the starter deck lands once, however many times it is added", async () => {
	const db = await fresh();
	const add = `INSERT INTO public.responsibility_cards (couple_id, title, deck_key) VALUES
    ('${COUPLE}','Trash & recycling','trash'),('${COUPLE}','Groceries','groceries')
    ON CONFLICT (couple_id, deck_key) DO NOTHING`;
	await asUser(db, A);
	await db.exec(add);
	await asUser(db, B);
	await db.exec(add);
	assert.deepEqual(
		(await rows(db, CARDS)).map((r) => r.title),
		["Car", "Groceries", "Trash & recycling"],
	);
	// Cards the couple writes themselves have no deck_key and never collide.
	await db.exec(
		`INSERT INTO public.responsibility_cards (couple_id, title) VALUES ('${COUPLE}','Taxes'),('${COUPLE}','Taxes')`,
	);
	assert.equal((await rows(db, CARDS)).length, 5);
});

await test("removing a card is a soft delete, and the app cannot hard-delete", async () => {
	const db = await fresh();
	await asUser(db, B);
	await db.exec(
		`UPDATE public.responsibility_cards SET removed_at=now(), removed_by='${B}' WHERE couple_id='${COUPLE}' AND deck_key='car'`,
	);
	assert.deepEqual(
		(await rows(db, CARDS)).map((r) => r.title),
		["Trash & recycling"],
	);
	await db.exec(`DELETE FROM public.responsibility_cards WHERE couple_id='${COUPLE}'`);
	await asAdmin(db);
	assert.equal(await n(db, "SELECT count(*)::int AS n FROM public.responsibility_cards"), 2);
});

await test("a blank title, an unknown category and an over-long title are refused", async () => {
	const db = await fresh();
	await asUser(db, A);
	const insert = (title, category = "home") =>
		db.exec(
			`INSERT INTO public.responsibility_cards (couple_id, title, category) VALUES ('${COUPLE}','${title}','${category}')`,
		);
	await assert.rejects(insert("   "));
	await assert.rejects(insert("Taxes", "magic"));
	await assert.rejects(insert("x".repeat(81)));
});

await test("a leaving partner's cards go back to not dealt; a solo leaver's cards go with the couple", async () => {
	const linked = await fresh();
	await linked.exec(`SELECT set_config('test.uid', '${A}', false)`);
	await linked.exec("SELECT public.delete_my_account()");
	await asAdmin(linked);
	assert.deepEqual(await rows(linked, CARDS), [
		{ title: "Car", holder_id: null },
		{ title: "Trash & recycling", holder_id: null },
	]);

	const solo = await fresh({ linked: false });
	await solo.exec(`SELECT set_config('test.uid', '${A}', false)`);
	await solo.exec("SELECT public.delete_my_account()");
	await asAdmin(solo);
	assert.equal(await n(solo, "SELECT count(*)::int AS n FROM public.responsibility_cards"), 0);
});

// ---------------------------------------------------------------------------
// Migration 026: "I did this today"
// ---------------------------------------------------------------------------
const DONE = `SELECT done_by, done_on::text AS done_on FROM public.responsibility_card_completions WHERE couple_id='${COUPLE}' AND undone_at IS NULL ORDER BY done_on, done_by`;
const cardId = async (db, key) =>
	(
		await db.query(
			`SELECT id FROM public.responsibility_cards WHERE couple_id='${COUPLE}' AND deck_key='${key}'`,
		)
	).rows[0].id;
const markSql = (card, who, day, couple = COUPLE) =>
	`INSERT INTO public.responsibility_card_completions (card_id, couple_id, done_by, done_on) VALUES ('${card}','${couple}','${who}','${day}')`;

await test("026 applies to a fresh database and can run twice", async () => {
	assert.ok(MIGRATIONS.includes("026_card_completions.sql"));
	const db = await migratedDb();
	await db.exec(
		fs.readFileSync(new URL("../migrations/026_card_completions.sql", import.meta.url), "utf8"),
	);
	assert.equal(
		await n(
			db,
			"SELECT count(*)::int AS n FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='responsibility_card_completions'",
		),
		1,
	);
});

await test("either partner can mark any of the couple's cards done, and both see it", async () => {
	const db = await fresh();
	await asAdmin(db);
	const trash = await cardId(db, "trash");
	await asUser(db, A);
	await db.exec(markSql(trash, A, "2026-11-14"));
	await asUser(db, B);
	// B did A's card: allowed, that is the point of keeping count.
	await db.exec(markSql(trash, B, "2026-11-15"));
	assert.deepEqual(await rows(db, DONE), [
		{ done_by: A, done_on: "2026-11-14" },
		{ done_by: B, done_on: "2026-11-15" },
	]);
	await asUser(db, OUTSIDER);
	assert.equal((await rows(db, DONE)).length, 0);
});

await test("nobody can mark a card done in their partner's name, or from outside the couple", async () => {
	const db = await fresh();
	await asAdmin(db);
	const trash = await cardId(db, "trash");
	await asUser(db, A);
	await assert.rejects(db.exec(markSql(trash, B, "2026-11-15")));
	await asUser(db, OUTSIDER);
	await assert.rejects(db.exec(markSql(trash, OUTSIDER, "2026-11-15")));
	// Their own couple, somebody else's card.
	await assert.rejects(db.exec(markSql(trash, OUTSIDER, "2026-11-15", OTHER_COUPLE)));
});

await test("a double tap is one mark; a mark can be taken back and made again", async () => {
	const db = await fresh();
	await asAdmin(db);
	const trash = await cardId(db, "trash");
	await asUser(db, A);
	await db.exec(markSql(trash, A, "2026-11-15"));
	await assert.rejects(db.exec(markSql(trash, A, "2026-11-15")), /duplicate|unique/i);
	await db.exec(
		`UPDATE public.responsibility_card_completions SET undone_at=now() WHERE card_id='${trash}' AND done_by='${A}' AND done_on='2026-11-15' AND undone_at IS NULL`,
	);
	assert.equal((await rows(db, DONE)).length, 0);
	await db.exec(markSql(trash, A, "2026-11-15"));
	assert.equal((await rows(db, DONE)).length, 1);
});

await test("only your own mark can be taken back, and nothing is hard-deleted", async () => {
	const db = await fresh();
	await asAdmin(db);
	const trash = await cardId(db, "trash");
	await asUser(db, A);
	await db.exec(markSql(trash, A, "2026-11-15"));
	await asUser(db, B);
	await db.exec(`UPDATE public.responsibility_card_completions SET undone_at=now()`);
	await db.exec(`DELETE FROM public.responsibility_card_completions`);
	assert.deepEqual(await rows(db, DONE), [{ done_by: A, done_on: "2026-11-15" }]);
});

await test("a leaving partner's marks stay without their name; a solo leaver's go with the couple", async () => {
	const linked = await fresh();
	await asAdmin(linked);
	const trash = await cardId(linked, "trash");
	await linked.exec(markSql(trash, A, "2026-11-15"));
	await linked.exec(`SELECT set_config('test.uid', '${A}', false)`);
	await linked.exec("SELECT public.delete_my_account()");
	await asAdmin(linked);
	assert.deepEqual(await rows(linked, DONE), [{ done_by: null, done_on: "2026-11-15" }]);

	const solo = await fresh({ linked: false });
	await asAdmin(solo);
	await solo.exec(markSql(await cardId(solo, "trash"), A, "2026-11-15"));
	await solo.exec(`SELECT set_config('test.uid', '${A}', false)`);
	await solo.exec("SELECT public.delete_my_account()");
	await asAdmin(solo);
	assert.equal(
		await n(solo, "SELECT count(*)::int AS n FROM public.responsibility_card_completions"),
		0,
	);
});

console.log(`${passed} passed`);
