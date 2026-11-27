// Migration 028 (event date, calendar adds, action counts) on the real schema:
// every migration applied to PGlite (all-migrations.mjs), then the reads and
// writes of lib/calendar-adds.ts and lib/action-events.ts run through RLS as
// the signed-in user. `npm run test:sql`.
import assert from "node:assert/strict";
import fs from "node:fs";

import { MIGRATIONS, asAdmin, asUser, migratedDb } from "./all-migrations.mjs";

const A = "00000000-0000-0000-0000-0000000000a1";
const B = "00000000-0000-0000-0000-0000000000b2";
const OUTSIDER = "00000000-0000-0000-0000-0000000000c3";
const COUPLE = "c0000000-0000-0000-0000-000000000027";
const OTHER_COUPLE = "c0000000-0000-0000-0000-000000000099";

const DONE = "d0000000-0000-0000-0000-000000000001"; // the couple's, completed
const THEIRS = "d0000000-0000-0000-0000-000000000002"; // the outsider's

/** The provider's read (lib/calendar-adds.ts fetchCalendarAdds), minus its state filter. */
const ADDS = `SELECT added_by, method, state, confirmed FROM public.decision_calendar_adds WHERE couple_id='${COUPLE}' ORDER BY added_by`;
const EVENTS = `SELECT user_id, couple_id, action, event, signal FROM public.action_events ORDER BY user_id, action, event`;

const rows = async (db, q) => (await db.query(q)).rows;
const n = async (db, q) => Number((await db.query(q)).rows[0].n);

const addSql = (
	who,
	{
		decision = DONE,
		couple = COUPLE,
		state = "opened",
		method = "google_link",
		confirmed = false,
	} = {},
) =>
	`INSERT INTO public.decision_calendar_adds (decision_id, couple_id, added_by, method, state, confirmed, snapshot)
   VALUES ('${decision}','${couple}','${who}','${method}','${state}',${confirmed},'v1:abc')`;

/** markOpened / markAdded: one statement, insert or take over your own row. */
const upsertSql = (who, state, confirmed = false) =>
	`${addSql(who, { state, confirmed })}
   ON CONFLICT (decision_id, added_by)
   DO UPDATE SET state = EXCLUDED.state, method = EXCLUDED.method, snapshot = EXCLUDED.snapshot, confirmed = EXCLUDED.confirmed`;

/** logActionEvent: the decision and the three enums, nothing else. */
const eventSql = (action, event, signal, decision = DONE) =>
	`INSERT INTO public.action_events (decision_id, action, event, signal)
   VALUES ('${decision}','${action}','${event}','${signal}')
   ON CONFLICT (decision_id, user_id, action, event) DO NOTHING`;

async function fresh({ linked = true } = {}) {
	const db = await migratedDb();
	await db.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${A}','a@x.com'),('${B}','b@x.com'),('${OUTSIDER}','c@x.com');
    INSERT INTO public.couples (id, user1_id, user2_id) VALUES
      ('${COUPLE}','${A}',${linked ? `'${B}'` : "NULL"}),
      ('${OTHER_COUPLE}','${OUTSIDER}',NULL);
    UPDATE public.profiles SET couple_id='${COUPLE}' WHERE id IN ('${A}'${linked ? `,'${B}'` : ""});
    UPDATE public.profiles SET couple_id='${OTHER_COUPLE}' WHERE id='${OUTSIDER}';
    INSERT INTO public.decisions (id,couple_id,creator_id,partner_id,title,type,status,current_round) VALUES
      ('${DONE}','${COUPLE}','${A}','${linked ? B : A}','Nutcracker on Dec 12?','vote','completed',1),
      ('${THEIRS}','${OTHER_COUPLE}','${OUTSIDER}','${OUTSIDER}','Solo trip','vote','completed',1);
  `);
	return db;
}

let passed = 0;
async function test(name, fn) {
	await fn();
	passed++;
	console.log("  ✓", name);
}

console.log(`decision calendar (${MIGRATIONS[0]} → ${MIGRATIONS.at(-1)})`);

await test("028 applies to a fresh database and can run twice", async () => {
	assert.ok(MIGRATIONS.includes("028_decision_calendar.sql"));
	const db = await migratedDb();
	await db.exec(
		fs.readFileSync(new URL("../migrations/028_decision_calendar.sql", import.meta.url), "utf8"),
	);
	assert.equal(
		await n(
			db,
			"SELECT count(*)::int AS n FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='decision_calendar_adds'",
		),
		1,
	);
	// The tally is not published: nobody listens for it.
	assert.equal(
		await n(
			db,
			"SELECT count(*)::int AS n FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='action_events'",
		),
		0,
	);
});

// ---------------------------------------------------------------------------
// decisions.event_on / event_time / event_tz
// ---------------------------------------------------------------------------
await test("a decision starts with no event date, and either partner can set one", async () => {
	const db = await fresh();
	const WHEN = `SELECT event_on::text AS event_on, event_time::text AS event_time, event_tz FROM public.decisions WHERE id='${DONE}'`;
	await asUser(db, A);
	assert.deepEqual(await rows(db, WHEN), [{ event_on: null, event_time: null, event_tz: null }]);
	await asUser(db, B);
	await db.exec(
		`UPDATE public.decisions SET event_on='2026-12-12', event_time='19:30', event_tz='America/Denver' WHERE id='${DONE}'`,
	);
	await asUser(db, A);
	assert.deepEqual(await rows(db, WHEN), [
		{ event_on: "2026-12-12", event_time: "19:30:00", event_tz: "America/Denver" },
	]);
	// All day: a date with no time.
	await db.exec(`UPDATE public.decisions SET event_time=NULL WHERE id='${DONE}'`);
	assert.equal((await rows(db, WHEN))[0].event_time, null);
});

// ---------------------------------------------------------------------------
// decision_calendar_adds
// ---------------------------------------------------------------------------
await test("a partner's add is seen by both of them; an outsider and a signed-out caller see none", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(addSql(A));
	assert.equal((await rows(db, ADDS)).length, 1);
	await asUser(db, B);
	assert.deepEqual(await rows(db, ADDS), [
		{ added_by: A, method: "google_link", state: "opened", confirmed: false },
	]);
	await asUser(db, OUTSIDER);
	assert.equal((await rows(db, ADDS)).length, 0);
	await asUser(db, null);
	await assert.rejects(db.query(ADDS));
});

await test("nobody can record an add in their partner's name, or from outside the couple", async () => {
	const db = await fresh();
	await asUser(db, A);
	await assert.rejects(db.exec(addSql(B)));
	await asUser(db, OUTSIDER);
	await assert.rejects(db.exec(addSql(OUTSIDER)));
	await assert.rejects(db.exec(addSql(A)));
	// Their own couple, somebody else's decision.
	await assert.rejects(db.exec(addSql(OUTSIDER, { couple: OTHER_COUPLE })));
	// A member cannot file the couple's decision under another couple either.
	await asUser(db, A);
	await assert.rejects(db.exec(addSql(A, { couple: OTHER_COUPLE })));
	await assert.rejects(db.exec(addSql(A, { decision: THEIRS })));
	await asAdmin(db);
	assert.equal(await n(db, "SELECT count(*)::int AS n FROM public.decision_calendar_adds"), 0);
});

await test("one row per person per decision: a second add takes over the first, and each partner has their own", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(addSql(A));
	await assert.rejects(db.exec(addSql(A, { state: "added" })), /duplicate|unique/i);
	// opened → added, the way the app writes it.
	await db.exec(upsertSql(A, "added", true));
	await asUser(db, B);
	await db.exec(upsertSql(B, "opened"));
	assert.deepEqual(await rows(db, ADDS), [
		{ added_by: A, method: "google_link", state: "added", confirmed: true },
		{ added_by: B, method: "google_link", state: "opened", confirmed: false },
	]);
});

await test("writing again moves updated_at on, so a stale 'opened' can be told from a fresh one", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(addSql(A));
	await asAdmin(db);
	await db.exec(
		`ALTER TABLE public.decision_calendar_adds DISABLE TRIGGER update_decision_calendar_adds_updated_at;
     UPDATE public.decision_calendar_adds SET updated_at = now() - interval '1 hour';
     ALTER TABLE public.decision_calendar_adds ENABLE TRIGGER update_decision_calendar_adds_updated_at;`,
	);
	await asUser(db, A);
	await db.exec(upsertSql(A, "opened"));
	assert.equal(
		await n(
			db,
			"SELECT count(*)::int AS n FROM public.decision_calendar_adds WHERE updated_at > now() - interval '1 minute'",
		),
		1,
	);
});

await test("only your own add can be changed, and it cannot be handed to someone else", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(upsertSql(A, "added", true));
	await asUser(db, B);
	await db.exec(`UPDATE public.decision_calendar_adds SET state='removed'`);
	// B's upsert makes B's own row; it does not touch A's.
	await db.exec(upsertSql(B, "opened"));
	await asUser(db, A);
	await assert.rejects(db.exec(`UPDATE public.decision_calendar_adds SET added_by='${B}'`));
	await assert.rejects(
		db.exec(
			`UPDATE public.decision_calendar_adds SET couple_id='${OTHER_COUPLE}' WHERE added_by='${A}'`,
		),
	);
	await assert.rejects(
		db.exec(`UPDATE public.decision_calendar_adds SET decision_id='${THEIRS}' WHERE added_by='${A}'`),
	);
	await asAdmin(db);
	assert.deepEqual(await rows(db, ADDS), [
		{ added_by: A, method: "google_link", state: "added", confirmed: true },
		{ added_by: B, method: "google_link", state: "opened", confirmed: false },
	]);
});

await test("taking it back is a state, the partner still sees the row, and nothing is hard-deleted", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(upsertSql(A, "added", true));
	await db.exec(
		`UPDATE public.decision_calendar_adds SET state='removed', confirmed=false WHERE decision_id='${DONE}' AND added_by='${A}'`,
	);
	await asUser(db, B);
	// Still visible: this is what lets Realtime deliver the removal.
	assert.deepEqual(await rows(db, ADDS), [
		{ added_by: A, method: "google_link", state: "removed", confirmed: false },
	]);
	await db.exec(`DELETE FROM public.decision_calendar_adds`);
	await asUser(db, A);
	await db.exec(`DELETE FROM public.decision_calendar_adds`);
	assert.equal((await rows(db, ADDS)).length, 1);
	// And it can be added again afterwards.
	await db.exec(upsertSql(A, "added", true));
	assert.equal((await rows(db, ADDS))[0].state, "added");
});

await test("an unknown method or state is refused", async () => {
	const db = await fresh();
	await asUser(db, A);
	await assert.rejects(db.exec(addSql(A, { method: "outlook" })));
	await assert.rejects(db.exec(addSql(A, { state: "maybe" })));
});

// ---------------------------------------------------------------------------
// action_events
// ---------------------------------------------------------------------------
await test("an action is counted once per person, with who and which couple filled in by the database", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(eventSql("calendar", "shown", "parsed_date"));
	await db.exec(eventSql("calendar", "shown", "parsed_date"));
	await db.exec(eventSql("calendar", "tapped", "parsed_date"));
	await asUser(db, B);
	await db.exec(eventSql("calendar", "shown", "parsed_date"));
	// Each partner reads back only their own rows.
	assert.equal((await rows(db, EVENTS)).length, 1);
	await asAdmin(db);
	assert.deepEqual(await rows(db, EVENTS), [
		{ user_id: A, couple_id: COUPLE, action: "calendar", event: "shown", signal: "parsed_date" },
		{ user_id: A, couple_id: COUPLE, action: "calendar", event: "tapped", signal: "parsed_date" },
		{ user_id: B, couple_id: COUPLE, action: "calendar", event: "shown", signal: "parsed_date" },
	]);
});

await test("nobody can count an action on another couple's decision, or as someone else", async () => {
	const db = await fresh();
	await asUser(db, OUTSIDER);
	await assert.rejects(db.exec(eventSql("calendar", "shown", "none")));
	await asUser(db, A);
	await assert.rejects(db.exec(eventSql("calendar", "shown", "none", THEIRS)));
	await assert.rejects(
		db.exec(
			`INSERT INTO public.action_events (decision_id, user_id, action, event, signal) VALUES ('${DONE}','${B}','calendar','shown','none')`,
		),
	);
	await assert.rejects(
		db.exec(
			`INSERT INTO public.action_events (decision_id, couple_id, action, event, signal) VALUES ('${DONE}','${OTHER_COUPLE}','calendar','shown','none')`,
		),
	);
	await asUser(db, null);
	await assert.rejects(db.exec(eventSql("calendar", "shown", "none")));
	await asAdmin(db);
	assert.equal(await n(db, "SELECT count(*)::int AS n FROM public.action_events"), 0);
});

await test("the tally is insert-only, and takes no value outside its three lists", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(eventSql("open_link", "menu_picked", "none"));
	await db.exec(`UPDATE public.action_events SET signal='url'`);
	await db.exec(`DELETE FROM public.action_events`);
	await assert.rejects(db.exec(eventSql("shopping", "shown", "none")));
	await assert.rejects(db.exec(eventSql("calendar", "seen", "none")));
	await assert.rejects(db.exec(eventSql("calendar", "shown", "keyword")));
	await asAdmin(db);
	assert.deepEqual(await rows(db, EVENTS), [
		{ user_id: A, couple_id: COUPLE, action: "open_link", event: "menu_picked", signal: "none" },
	]);
	// No free-text column to put a decision's words in.
	assert.deepEqual(
		(
			await rows(
				db,
				"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='action_events' ORDER BY column_name",
			)
		).map((r) => r.column_name),
		["action", "couple_id", "created_at", "decision_id", "event", "id", "signal", "user_id"],
	);
});

// ---------------------------------------------------------------------------
// Account deletion (023)
// ---------------------------------------------------------------------------
await test("a leaving partner's add and counts stay without their name; a solo leaver's go with the couple", async () => {
	const linked = await fresh();
	await asUser(linked, A);
	await linked.exec(upsertSql(A, "added", true));
	await linked.exec(eventSql("calendar", "completed", "parsed_date"));
	await asUser(linked, B);
	await linked.exec(upsertSql(B, "added", true));
	await asAdmin(linked);
	await linked.exec(`SELECT set_config('test.uid', '${B}', false)`);
	await linked.exec("SELECT public.delete_my_account()");
	await asAdmin(linked);
	// A created the decision, so it stays, with A's add and B's nameless one.
	assert.deepEqual(
		(await rows(linked, ADDS)).map((r) => [r.added_by, r.state]),
		[
			[A, "added"],
			[null, "added"],
		],
	);
	assert.equal(await n(linked, "SELECT count(*)::int AS n FROM public.action_events"), 1);

	const solo = await fresh({ linked: false });
	await asUser(solo, A);
	await solo.exec(upsertSql(A, "added", true));
	await solo.exec(eventSql("calendar", "completed", "parsed_date"));
	await asAdmin(solo);
	await solo.exec(`SELECT set_config('test.uid', '${A}', false)`);
	await solo.exec("SELECT public.delete_my_account()");
	await asAdmin(solo);
	assert.equal(
		await n(
			solo,
			`SELECT count(*)::int AS n FROM public.decision_calendar_adds WHERE couple_id='${COUPLE}'`,
		),
		0,
	);
	assert.equal(
		await n(solo, `SELECT count(*)::int AS n FROM public.action_events WHERE couple_id='${COUPLE}'`),
		0,
	);
});

console.log(`${passed} passed`);
