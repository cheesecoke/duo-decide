// Migration 027 (partner invite gate) on the real schema: every migration
// applied to PGlite (all-migrations.mjs), then claim_partner_invite() called
// as the signed-in user, the way send-partner-invite does. `npm run test:sql`.
import assert from "node:assert/strict";

import { asAdmin, asUser, migratedDb } from "./all-migrations.mjs";

const SOLO = "00000000-0000-0000-0000-0000000027a1";
const P1 = "00000000-0000-0000-0000-0000000027b1";
const P2 = "00000000-0000-0000-0000-0000000027b2";
const LONER = "00000000-0000-0000-0000-0000000027c1";
const OTHER = "00000000-0000-0000-0000-0000000027d1";

async function fresh() {
	const db = await migratedDb();
	await db.exec(`
    INSERT INTO auth.users (id, email) VALUES
      ('${SOLO}','solo@x.com'),('${P1}','p1@x.com'),('${P2}','p2@x.com'),('${LONER}','loner@x.com'),('${OTHER}','other@x.com');
    UPDATE public.profiles SET display_name='Sam' WHERE id='${SOLO}';
    INSERT INTO public.couples (id, user1_id, user2_id) VALUES
      ('c0000000-0000-0000-0000-0000000027a1','${SOLO}',NULL),
      ('c0000000-0000-0000-0000-0000000027b1','${P1}','${P2}'),
      ('c0000000-0000-0000-0000-0000000027d1','${OTHER}',NULL);
  `);
	return db;
}

const claim = (db, email) =>
	db.query("SELECT public.claim_partner_invite($1) AS name", [email]).then((r) => r.rows[0].name);

async function rejects(promise, code) {
	await assert.rejects(promise, (e) => {
		assert.equal(e.code, code, `expected ${code}, got ${e.code}: ${e.message}`);
		return true;
	});
}

let passed = 0;
async function test(name, fn) {
	await fn();
	passed++;
	console.log("  ✓", name);
}

await test("solo user gets their own display name back and the send is recorded", async () => {
	const db = await fresh();
	await asUser(db, SOLO);
	assert.equal(await claim(db, "  Partner@X.com "), "Sam");
	await asAdmin(db);
	const { rows } = await db.query("SELECT user_id, partner_email FROM public.partner_invite_sends");
	assert.deepEqual(rows, [{ user_id: SOLO, partner_email: "partner@x.com" }]);
});

await test("anon is refused (no EXECUTE grant)", async () => {
	const db = await fresh();
	await asUser(db, null);
	await rejects(claim(db, "partner@x.com"), "42501");
});

await test("invalid address and self-invite are refused", async () => {
	const db = await fresh();
	await asUser(db, SOLO);
	await rejects(claim(db, "not-an-email"), "22023");
	await rejects(claim(db, "a@b"), "22023");
	await rejects(claim(db, "SOLO@x.com"), "22023");
});

await test("a user with no couple, or already paired, cannot send", async () => {
	const db = await fresh();
	await asUser(db, LONER);
	await rejects(claim(db, "partner@x.com"), "P0002");
	await asUser(db, P1);
	await rejects(claim(db, "partner@x.com"), "DD409");
});

await test("5 sends per hour per user, then refused", async () => {
	const db = await fresh();
	await asUser(db, SOLO);
	for (let i = 0; i < 5; i++) await claim(db, `p${i}@x.com`);
	await rejects(claim(db, "p6@x.com"), "DD429");
});

await test("10 sends per day per user", async () => {
	const db = await fresh();
	await asAdmin(db);
	await db.exec(`INSERT INTO public.partner_invite_sends (user_id, partner_email, sent_at)
    SELECT '${SOLO}', 'old' || g || '@x.com', now() - interval '3 hours' FROM generate_series(1,10) g`);
	await asUser(db, SOLO);
	await rejects(claim(db, "new@x.com"), "DD429");
});

await test("3 sends per day to one address, across users", async () => {
	const db = await fresh();
	await asAdmin(db);
	await db.exec(`INSERT INTO public.partner_invite_sends (user_id, partner_email)
    VALUES ('${OTHER}','victim@x.com'),('${OTHER}','victim@x.com'),('${OTHER}','victim@x.com')`);
	await asUser(db, SOLO);
	await rejects(claim(db, "Victim@x.com"), "DD429");
	assert.equal(await claim(db, "someone-else@x.com"), "Sam");
});

await test("signed-in users cannot read or write the send log directly", async () => {
	const db = await fresh();
	await asUser(db, SOLO);
	await claim(db, "partner@x.com");
	const { rows } = await db.query("SELECT * FROM public.partner_invite_sends");
	assert.equal(rows.length, 0);
	await assert.rejects(
		db.query(
			`INSERT INTO public.partner_invite_sends (user_id, partner_email) VALUES ('${SOLO}','x@x.com')`,
		),
	);
});

console.log(`partner-invite-gate: ${passed} passed`);
