// Migration 024 (archive + soft delete) on the real schema: every migration,
// 001 → latest, applied to PGlite (all-migrations.mjs), then the queue's and
// History's reads run through RLS as the signed-in user. `npm run test:sql`.
import assert from "node:assert/strict";

import { MIGRATIONS, asAdmin, asUser, migratedDb } from "./all-migrations.mjs";

const A = "00000000-0000-0000-0000-0000000000a1";
const B = "00000000-0000-0000-0000-0000000000b2";
const OUTSIDER = "00000000-0000-0000-0000-0000000000c3";
const COUPLE = "c0000000-0000-0000-0000-000000000024";
const OTHER_COUPLE = "c0000000-0000-0000-0000-000000000099";

const DONE = "d0000000-0000-0000-0000-000000000001"; // completed, B decided
const DONE_2 = "d0000000-0000-0000-0000-000000000002"; // completed, A decided
const OPEN = "d0000000-0000-0000-0000-000000000003"; // pending
const OPT = (n) => `e0000000-0000-0000-0000-00000000000${n}`;

/** The queue's read (lib/database.ts getActiveDecisions). */
const QUEUE = `SELECT title FROM public.decisions WHERE couple_id='${COUPLE}' AND archived_at IS NULL AND deleted_at IS NULL ORDER BY title`;
/** History's page read and its count (getCompletedDecisions / …Count). */
const HISTORY = `SELECT title FROM public.decisions WHERE couple_id='${COUPLE}' AND status='completed' AND deleted_at IS NULL ORDER BY title`;
const HISTORY_COUNT = `SELECT count(*)::int AS n FROM public.decisions WHERE couple_id='${COUPLE}' AND status='completed' AND deleted_at IS NULL`;

const titles = async (db, q) => (await db.query(q)).rows.map((r) => r.title);
const one = async (db, q) => (await db.query(q)).rows[0];
const n = async (db, q) => Number((await db.query(q)).rows[0].n);

async function fresh({ linked = true } = {}) {
	const db = await migratedDb();
	// handle_new_user (022) makes each profile.
	await db.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${A}','a@x.com'),('${B}','b@x.com'),('${OUTSIDER}','c@x.com');
    INSERT INTO public.couples (id, user1_id, user2_id, pending_partner_email) VALUES
      ('${COUPLE}','${A}',${linked ? `'${B}'` : "NULL"},${linked ? "NULL" : "'b@x.com'"}),
      ('${OTHER_COUPLE}','${OUTSIDER}',NULL,NULL);
    UPDATE public.profiles SET couple_id='${COUPLE}' WHERE id IN ('${A}'${linked ? `,'${B}'` : ""});
    UPDATE public.profiles SET couple_id='${OTHER_COUPLE}' WHERE id='${OUTSIDER}';
    INSERT INTO public.decisions (id,couple_id,creator_id,partner_id,title,type,status,current_round) VALUES
      ('${DONE}','${COUPLE}','${A}','${linked ? B : A}','Dinner','vote','completed',1),
      ('${DONE_2}','${COUPLE}','${linked ? B : A}','${A}','Movie','vote','completed',1),
      ('${OPEN}','${COUPLE}','${A}','${linked ? B : A}','Trip','poll','pending',1);
    INSERT INTO public.decision_options (id, decision_id, title) VALUES
      ('${OPT(1)}','${DONE}','Tacos'),('${OPT(2)}','${DONE_2}','Dune'),('${OPT(3)}','${OPEN}','Paris');
    UPDATE public.decisions SET decided_by='${linked ? B : A}', decided_at=now() - interval '1 day', final_decision='${OPT(1)}' WHERE id='${DONE}';
    UPDATE public.decisions SET decided_by='${A}', decided_at=now(), final_decision='${OPT(2)}' WHERE id='${DONE_2}';
    INSERT INTO public.votes (id, decision_id, user_id, option_id, round) VALUES
      ('f0000000-0000-0000-0000-000000000001','${DONE}','${linked ? B : A}','${OPT(1)}',1),
      ('f0000000-0000-0000-0000-000000000002','${OPEN}','${A}','${OPT(3)}',1);
  `);
	return db;
}

let passed = 0;
async function test(name, fn) {
	await fn();
	passed++;
	console.log("  ✓", name);
}

console.log(`archive + soft delete (${MIGRATIONS[0]} → ${MIGRATIONS.at(-1)})`);

await test("every migration applies cleanly to a fresh database, and 024 can run twice", async () => {
	assert.equal(MIGRATIONS.at(-1), "024_archive_soft_delete.sql");
	const db = await migratedDb();
	const fs = await import("node:fs");
	await db.exec(
		fs.readFileSync(new URL("../migrations/024_archive_soft_delete.sql", import.meta.url), "utf8"),
	);
	const cols = (
		await db.query(
			"SELECT column_name FROM information_schema.columns WHERE table_name='decisions' AND column_name IN ('archived_at','archived_by','deleted_at','deleted_by') ORDER BY 1",
		)
	).rows.map((r) => r.column_name);
	assert.deepEqual(cols, ["archived_at", "archived_by", "deleted_at", "deleted_by"]);
});

await test("archive (by the partner) hides it from the queue, not from History", async () => {
	const db = await fresh();
	await asUser(db, B);
	await db.exec(`SELECT public.archive_decision('${DONE}')`);
	assert.deepEqual(await titles(db, QUEUE), ["Movie", "Trip"]);
	assert.deepEqual(await titles(db, HISTORY), ["Dinner", "Movie"]);
	assert.equal(await n(db, HISTORY_COUNT), 2);
	const row = await one(
		db,
		`SELECT archived_at, archived_by, deleted_at FROM public.decisions WHERE id='${DONE}'`,
	);
	assert.ok(row.archived_at);
	assert.equal(row.archived_by, B);
	assert.equal(row.deleted_at, null);
	// The other partner sees the same thing — the archive is shared.
	await asUser(db, A);
	assert.deepEqual(await titles(db, QUEUE), ["Movie", "Trip"]);
});

await test("archiving twice keeps the first stamp", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(`SELECT public.archive_decision('${DONE}')`);
	const first = await one(db, `SELECT archived_at FROM public.decisions WHERE id='${DONE}'`);
	await asUser(db, B);
	await db.exec(`SELECT public.archive_decision('${DONE}')`);
	const second = await one(
		db,
		`SELECT archived_at, archived_by FROM public.decisions WHERE id='${DONE}'`,
	);
	assert.equal(String(second.archived_at), String(first.archived_at));
	assert.equal(second.archived_by, A);
});

await test("only a decided decision can be archived", async () => {
	const db = await fresh();
	await asUser(db, A);
	await assert.rejects(db.exec(`SELECT public.archive_decision('${OPEN}')`), /Only a decided/);
	assert.deepEqual(await titles(db, QUEUE), ["Dinner", "Movie", "Trip"]);
});

await test("unarchive moves it back to the queue", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(`SELECT public.archive_decision('${DONE}')`);
	await asUser(db, B);
	await db.exec(`SELECT public.unarchive_decision('${DONE}')`);
	assert.deepEqual(await titles(db, QUEUE), ["Dinner", "Movie", "Trip"]);
	const row = await one(
		db,
		`SELECT archived_at, archived_by FROM public.decisions WHERE id='${DONE}'`,
	);
	assert.equal(row.archived_at, null);
	assert.equal(row.archived_by, null);
});

await test("soft delete hides it from the queue, History and the stats — the row, options and votes stay", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(`SELECT public.archive_decision('${DONE}')`);
	await db.exec(`SELECT public.soft_delete_decision('${DONE}')`);
	assert.deepEqual(await titles(db, QUEUE), ["Movie", "Trip"]);
	assert.deepEqual(await titles(db, HISTORY), ["Movie"]);
	assert.equal(await n(db, HISTORY_COUNT), 1);
	// "Who decided more": B's decision no longer counts.
	const split = await one(
		db,
		`SELECT count(*) FILTER (WHERE decided_by='${A}')::int AS a, count(*) FILTER (WHERE decided_by='${B}')::int AS b FROM public.decisions WHERE couple_id='${COUPLE}' AND status='completed' AND deleted_at IS NULL`,
	);
	assert.deepEqual(split, { a: 1, b: 0 });

	await asAdmin(db);
	const row = await one(
		db,
		`SELECT deleted_at, deleted_by, archived_at FROM public.decisions WHERE id='${DONE}'`,
	);
	assert.ok(row.deleted_at, "the row is still there, with deleted_at set");
	assert.equal(row.deleted_by, A);
	assert.ok(row.archived_at);
	assert.equal(
		await n(db, `SELECT count(*)::int AS n FROM public.decision_options WHERE decision_id='${DONE}'`),
		1,
	);
	assert.equal(
		await n(db, `SELECT count(*)::int AS n FROM public.votes WHERE decision_id='${DONE}'`),
		1,
	);
});

await test("an open decision can be soft-deleted, by either partner; deleting twice keeps the first stamp", async () => {
	const db = await fresh();
	await asUser(db, B);
	await db.exec(`SELECT public.soft_delete_decision('${OPEN}')`);
	assert.deepEqual(await titles(db, QUEUE), ["Dinner", "Movie"]);
	await asUser(db, A);
	await db.exec(`SELECT public.soft_delete_decision('${OPEN}')`);
	await asAdmin(db);
	assert.equal(
		(await one(db, `SELECT deleted_by FROM public.decisions WHERE id='${OPEN}'`)).deleted_by,
		B,
	);
	assert.equal(
		await n(db, `SELECT count(*)::int AS n FROM public.votes WHERE decision_id='${OPEN}'`),
		1,
	);
});

await test("a soft-deleted decision cannot be archived, unarchived or edited", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(`SELECT public.soft_delete_decision('${DONE}')`);
	await assert.rejects(db.exec(`SELECT public.archive_decision('${DONE}')`), /not found/);
	await assert.rejects(db.exec(`SELECT public.unarchive_decision('${DONE}')`), /not found/);
	await db.exec(`UPDATE public.decisions SET title='Revived', deleted_at=NULL WHERE id='${DONE}'`);
	await asAdmin(db);
	const row = await one(db, `SELECT title, deleted_at FROM public.decisions WHERE id='${DONE}'`);
	assert.equal(row.title, "Dinner");
	assert.ok(row.deleted_at);
});

await test("RLS: an outsider cannot archive, unarchive or delete another couple's decision", async () => {
	const db = await fresh();
	await asUser(db, OUTSIDER);
	for (const fn of ["archive_decision", "unarchive_decision", "soft_delete_decision"]) {
		await assert.rejects(db.exec(`SELECT public.${fn}('${DONE}')`), /not found/, fn);
	}
	assert.deepEqual(await titles(db, QUEUE), [], "and cannot see it at all");
	await db.exec(`UPDATE public.decisions SET deleted_at=now() WHERE id='${DONE}'`);
	await asAdmin(db);
	const row = await one(
		db,
		`SELECT archived_at, deleted_at FROM public.decisions WHERE id='${DONE}'`,
	);
	assert.deepEqual(row, { archived_at: null, deleted_at: null });
});

await test("RLS: signed out is refused, and anon cannot even call the RPCs", async () => {
	const db = await fresh();
	await asUser(db, null);
	await assert.rejects(
		db.exec(`SELECT public.soft_delete_decision('${DONE}')`),
		/permission denied/,
	);
	await asAdmin(db);
	const grants = (
		await db.query(
			"SELECT routine_name, grantee FROM information_schema.routine_privileges WHERE routine_name IN ('archive_decision','unarchive_decision','soft_delete_decision','decision_for_member')",
		)
	).rows;
	for (const fn of ["archive_decision", "unarchive_decision", "soft_delete_decision"]) {
		const who = grants.filter((g) => g.routine_name === fn).map((g) => g.grantee);
		assert.ok(who.includes("authenticated"), fn);
		assert.ok(!who.includes("anon"), fn);
		assert.ok(!who.includes("PUBLIC"), fn);
	}
	const helper = grants
		.filter((g) => g.routine_name === "decision_for_member")
		.map((g) => g.grantee);
	assert.ok(!helper.includes("authenticated") && !helper.includes("anon"), "the helper is internal");
});

await test("RLS: a client cannot soft-delete by writing deleted_at, and cannot hard-delete at all", async () => {
	const db = await fresh();
	await asUser(db, A);
	await assert.rejects(
		db.exec(`UPDATE public.decisions SET deleted_at=now() WHERE id='${OPEN}'`),
		/row-level security/,
	);
	await db.exec(`DELETE FROM public.decisions WHERE id='${OPEN}'`);
	await asAdmin(db);
	assert.equal(await n(db, "SELECT count(*)::int AS n FROM public.decisions"), 3);
});

await test("RLS: the couple can still read a soft-deleted row (so realtime tells the partner); the app filters it", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(`SELECT public.soft_delete_decision('${OPEN}')`);
	await asUser(db, B);
	const row = await one(db, `SELECT deleted_at FROM public.decisions WHERE id='${OPEN}'`);
	assert.ok(row?.deleted_at);
});

await test("ordinary edits and votes on live decisions still work under the new UPDATE policy", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(`UPDATE public.decisions SET title='Trip to Lisbon' WHERE id='${OPEN}'`);
	await asUser(db, B);
	await db.exec(
		`INSERT INTO public.votes (id, decision_id, user_id, option_id, round) VALUES ('f0000000-0000-0000-0000-000000000009','${OPEN}','${B}','${OPT(3)}',1)`,
	);
	await asAdmin(db);
	assert.equal(
		(await one(db, `SELECT title FROM public.decisions WHERE id='${OPEN}'`)).title,
		"Trip to Lisbon",
	);
	assert.equal(
		await n(db, `SELECT count(*)::int AS n FROM public.votes WHERE decision_id='${OPEN}'`),
		2,
	);
});

await test("delete_my_account (solo) still hard-removes everything, archived and soft-deleted rows included", async () => {
	const db = await fresh({ linked: false });
	await asUser(db, A);
	await db.exec(`SELECT public.archive_decision('${DONE}')`);
	await db.exec(`SELECT public.soft_delete_decision('${DONE_2}')`);
	await asAdmin(db);
	await db.exec(`SELECT set_config('test.uid', '${A}', false)`);
	await db.exec("SELECT public.delete_my_account()");
	for (const t of ["decisions", "decision_options", "votes"]) {
		assert.equal(await n(db, `SELECT count(*)::int AS n FROM public.${t}`), 0, t);
	}
	assert.equal(await n(db, `SELECT count(*)::int AS n FROM auth.users WHERE id='${A}'`), 0);
});

await test("delete_my_account (linked) still removes the leaver: open rows gone, their ids cleared from archived/deleted stamps", async () => {
	const db = await fresh();
	await asUser(db, A);
	await db.exec(`SELECT public.archive_decision('${DONE}')`);
	await db.exec(`SELECT public.soft_delete_decision('${DONE_2}')`);
	await asAdmin(db);
	await db.exec(`SELECT set_config('test.uid', '${A}', false)`);
	await db.exec("SELECT public.delete_my_account()");
	await asAdmin(db);
	const rows = (
		await db.query(
			"SELECT title, creator_id, decided_by, archived_by, deleted_by, archived_at IS NOT NULL AS archived, deleted_at IS NOT NULL AS deleted FROM public.decisions ORDER BY title",
		)
	).rows;
	assert.deepEqual(
		rows.map((r) => r.title),
		["Dinner", "Movie"],
		"the open decision is hard-deleted",
	);
	for (const r of rows) {
		assert.notEqual(r.creator_id, A);
		assert.notEqual(r.decided_by, A);
		assert.equal(r.archived_by, null);
		assert.equal(r.deleted_by, null);
	}
	assert.ok(rows.find((r) => r.title === "Dinner").archived);
	assert.ok(rows.find((r) => r.title === "Movie").deleted);
	assert.equal(await n(db, `SELECT count(*)::int AS n FROM public.votes WHERE user_id='${A}'`), 0);
	assert.equal(await n(db, `SELECT count(*)::int AS n FROM public.profiles WHERE id='${A}'`), 0);
});

await test("cleanup_orphaned_decisions still keeps completed history, archived or not", async () => {
	const db = await fresh();
	await asUser(db, B);
	await db.exec(`SELECT public.archive_decision('${DONE}')`);
	await asAdmin(db);
	await db.exec(`SELECT set_config('test.uid', '${A}', false)`);
	await db.exec("SELECT public.delete_my_account()");
	await db.exec(`SELECT set_config('test.uid', '${B}', false)`);
	await db.exec("SELECT * FROM public.cleanup_orphaned_decisions()");
	assert.equal(await n(db, "SELECT count(*)::int AS n FROM public.decisions"), 2);
});

console.log(`${passed} passed`);
