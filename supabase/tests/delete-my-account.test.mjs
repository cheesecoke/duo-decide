// Runs migration 023 against a real Postgres (PGlite, in-process) on a
// stand-in Supabase schema and checks every deletion path. `npm run test:sql`.
// The tables mirror supabase/migrations with the strictest FKs they declare.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";

const MIGRATION = fs.readFileSync(
	new URL("../migrations/023_delete_my_account.sql", import.meta.url),
	"utf8",
);

// Supabase stand-ins + the tables as the migrations define them (strictest FKs).
const BASE = `
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, email text, display_name text, couple_id uuid);
CREATE TABLE public.couples (id uuid PRIMARY KEY, user1_id uuid NOT NULL REFERENCES public.profiles(id), user2_id uuid REFERENCES public.profiles(id), pending_partner_email text);
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_couple FOREIGN KEY (couple_id) REFERENCES public.couples(id);
CREATE TABLE public.decisions (id uuid PRIMARY KEY, couple_id uuid NOT NULL REFERENCES public.couples(id), creator_id uuid NOT NULL REFERENCES public.profiles(id), partner_id uuid NOT NULL REFERENCES public.profiles(id), title text, status text, decided_by uuid REFERENCES public.profiles(id), final_decision uuid);
CREATE TABLE public.decision_options (id uuid PRIMARY KEY, decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE, title text);
ALTER TABLE public.decisions ADD FOREIGN KEY (final_decision) REFERENCES public.decision_options(id);
CREATE TABLE public.votes (id uuid PRIMARY KEY, decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, option_id uuid NOT NULL REFERENCES public.decision_options(id) ON DELETE CASCADE);
CREATE TABLE public.option_lists (id uuid PRIMARY KEY, couple_id uuid NOT NULL REFERENCES public.couples(id), creator_id uuid REFERENCES public.profiles(id), title text);
CREATE TABLE public.option_list_items (id uuid PRIMARY KEY, option_list_id uuid NOT NULL REFERENCES public.option_lists(id) ON DELETE CASCADE, title text);
`;

const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
const A = U(1),
	B = U(2),
	C = U(3);
const COUPLE = "c0000000-0000-0000-0000-000000000001";

async function fresh({ linked }) {
	const db = new PGlite();
	await db.exec(BASE);
	await db.exec(MIGRATION);
	await db.exec(`
    INSERT INTO auth.users VALUES ('${A}','a@x.com'),('${B}','b@x.com'),('${C}','c@x.com');
    INSERT INTO public.profiles (id,email) VALUES ('${A}','a@x.com'),('${B}','b@x.com'),('${C}','c@x.com');
    INSERT INTO public.couples VALUES ('${COUPLE}','${A}',${linked ? `'${B}'` : "NULL"},${linked ? "NULL" : "'b@x.com'"});
    UPDATE public.profiles SET couple_id='${COUPLE}' WHERE id IN ('${A}'${linked ? `,'${B}'` : ""});
    -- d1: completed, A created, B decided.  d2: completed, B created, A decided.  d3: open, A created.
    INSERT INTO public.decisions (id,couple_id,creator_id,partner_id,title,status) VALUES
      ('d0000000-0000-0000-0000-000000000001','${COUPLE}','${A}','${linked ? B : A}','Dinner','completed'),
      ('d0000000-0000-0000-0000-000000000002','${COUPLE}','${linked ? B : A}','${A}','Movie','completed'),
      ('d0000000-0000-0000-0000-000000000003','${COUPLE}','${A}','${linked ? B : A}','Trip','pending');
    INSERT INTO public.decision_options VALUES
      ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','Tacos'),
      ('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000002','Dune'),
      ('e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000003','Paris');
    UPDATE public.decisions SET decided_by='${linked ? B : A}', final_decision='e0000000-0000-0000-0000-000000000001' WHERE title='Dinner';
    UPDATE public.decisions SET decided_by='${A}', final_decision='e0000000-0000-0000-0000-000000000002' WHERE title='Movie';
    INSERT INTO public.votes VALUES
      ('f0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','${A}','e0000000-0000-0000-0000-000000000001'),
      ('f0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001','${linked ? B : A}','e0000000-0000-0000-0000-000000000001'),
      ('f0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000003','${A}','e0000000-0000-0000-0000-000000000003');
    INSERT INTO public.option_lists VALUES ('b0000000-0000-0000-0000-000000000001','${COUPLE}','${A}','Date nights');
    INSERT INTO public.option_list_items VALUES ('b1000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Bowling');
  `);
	return db;
}
const as = async (db, uid) => db.exec(`SELECT set_config('test.uid', '${uid ?? ""}', false)`);
const rows = async (db, q) => (await db.query(q)).rows;
const count = async (db, q) =>
	Number((await db.query(`SELECT count(*)::int AS n FROM ${q}`)).rows[0].n);

let passed = 0;
async function test(name, fn) {
	await fn();
	passed++;
	console.log("  ✓", name);
}

await test("linked: A (user1) leaves — history kept for B, open decision gone, B re-seated", async () => {
	const db = await fresh({ linked: true });
	await as(db, A);
	await db.exec("SELECT public.delete_my_account()");
	assert.equal(await count(db, `auth.users WHERE id='${A}'`), 0);
	assert.equal(await count(db, `public.profiles WHERE id='${A}'`), 0);
	const ds = await rows(
		db,
		"SELECT title,status,creator_id,partner_id,decided_by FROM public.decisions ORDER BY title",
	);
	assert.deepEqual(
		ds.map((d) => d.title),
		["Dinner", "Movie"],
	);
	const dinner = ds.find((d) => d.title === "Dinner"),
		movie = ds.find((d) => d.title === "Movie");
	assert.equal(dinner.creator_id, null);
	assert.equal(dinner.partner_id, B);
	assert.equal(dinner.decided_by, B);
	assert.equal(movie.creator_id, B);
	assert.equal(movie.partner_id, null);
	assert.equal(movie.decided_by, null);
	assert.equal(await count(db, `public.votes WHERE user_id='${A}'`), 0);
	assert.equal(await count(db, `public.votes WHERE user_id='${B}'`), 1);
	const [c] = await rows(db, "SELECT * FROM public.couples");
	assert.equal(c.user1_id, B);
	assert.equal(c.user2_id, null);
	assert.equal(c.pending_partner_email, null);
	const [l] = await rows(db, "SELECT creator_id FROM public.option_lists");
	assert.equal(l.creator_id, null);
	assert.equal(await count(db, "public.option_list_items"), 1);
	assert.equal(
		(await rows(db, `SELECT couple_id FROM public.profiles WHERE id='${B}'`))[0].couple_id,
		COUPLE,
	);
});

await test("linked: B (user2) leaves — A stays user1", async () => {
	const db = await fresh({ linked: true });
	await as(db, B);
	await db.exec("SELECT public.delete_my_account()");
	const [c] = await rows(db, "SELECT * FROM public.couples");
	assert.equal(c.user1_id, A);
	assert.equal(c.user2_id, null);
	assert.equal(await count(db, "public.decisions"), 2);
	assert.equal(await count(db, `auth.users WHERE id='${B}'`), 0);
});

await test("solo (pending invite): everything in the couple is deleted", async () => {
	const db = await fresh({ linked: false });
	await as(db, A);
	await db.exec("SELECT public.delete_my_account()");
	for (const t of [
		"public.couples",
		"public.decisions",
		"public.decision_options",
		"public.votes",
		"public.option_lists",
		"public.option_list_items",
	]) {
		assert.equal(await count(db, t), 0, t);
	}
	assert.equal(await count(db, `auth.users WHERE id='${A}'`), 0);
	assert.equal(await count(db, `auth.users WHERE id='${B}'`), 1, "unrelated user untouched");
});

await test("no couple at all: just the account", async () => {
	const db = await fresh({ linked: true });
	await as(db, C);
	await db.exec("SELECT public.delete_my_account()");
	assert.equal(await count(db, `auth.users WHERE id='${C}'`), 0);
	assert.equal(await count(db, "public.decisions"), 3);
});

await test("signed out: refused, nothing deleted", async () => {
	const db = await fresh({ linked: true });
	await as(db, null);
	await assert.rejects(db.exec("SELECT public.delete_my_account()"), /Not authenticated/);
	assert.equal(await count(db, "auth.users"), 3);
});

await test("then both partners leave: the couple's history goes with the last one", async () => {
	const db = await fresh({ linked: true });
	await as(db, A);
	await db.exec("SELECT public.delete_my_account()");
	await as(db, B);
	await db.exec("SELECT public.delete_my_account()");
	assert.equal(await count(db, "public.couples"), 0);
	assert.equal(await count(db, "public.decisions"), 0);
	assert.equal(await count(db, "public.option_lists"), 0);
	assert.equal(await count(db, "auth.users"), 1);
});

await test("cleanup_orphaned_decisions keeps a former couple's completed history", async () => {
	const db = await fresh({ linked: true });
	await as(db, A);
	await db.exec("SELECT public.delete_my_account()");
	await as(db, B);
	await db.exec("SELECT * FROM public.cleanup_orphaned_decisions()");
	assert.equal(await count(db, "public.decisions"), 2);
});

await test("only authenticated can execute", async () => {
	const db = await fresh({ linked: true });
	const grants = await rows(
		db,
		"SELECT grantee FROM information_schema.routine_privileges WHERE routine_name='delete_my_account' ORDER BY grantee",
	);
	const who = grants.map((g) => g.grantee);
	assert.ok(who.includes("authenticated"));
	assert.ok(!who.includes("anon"));
	assert.ok(!who.includes("PUBLIC"));
});

console.log(`${passed} passed`);
