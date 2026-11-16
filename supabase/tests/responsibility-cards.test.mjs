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

console.log(`${passed} passed`);
