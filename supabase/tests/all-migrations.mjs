// Applies every migration in supabase/migrations, 001 → latest, to a fresh
// PGlite (in-process Postgres), on the smallest Supabase stand-in that lets
// them run: the roles, auth.users, auth.uid() and the realtime publication.
//
// Three of the early migrations (005, 007, 019) were one-off fixes run by hand in the
// Supabase SQL editor against Chase's own test accounts. They are replayed
// here as production saw them, with the shims below; nothing else is patched.
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import fs from "node:fs";

const DIR = new URL("../migrations/", import.meta.url);

export const MIGRATIONS = fs
	.readdirSync(DIR)
	.filter((f) => /^\d{3}_.*\.sql$/.test(f))
	.sort();

const SUPABASE_STANDIN = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb, created_at timestamptz DEFAULT now());
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
CREATE PUBLICATION supabase_realtime;
-- 005 and 007 look these accounts up by email / id and raise without them.
INSERT INTO auth.users (id, email) VALUES
  ('a3cc73ea-9c99-42a2-acf5-3aec595fca96', 'chase@example.com'),
  ('cf1b1ca0-cc0a-4c53-9e38-418e628f9471', 'partner@example.com'),
  ('5a5a5a5a-0000-0000-0000-000000000005', 'chasetest70@gmail.com');
`;

const SHIMS = {
	// Production's couples table has updated_at (schema.sql); 001 never added it.
	"005_update_test_couple.sql": {
		before:
			"ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();",
	},
	// 007 re-links profiles to the test couple that test-data.sql had made.
	"007_ensure_user_profiles.sql": {
		before: `
      INSERT INTO public.profiles (id, email) VALUES
        ('a3cc73ea-9c99-42a2-acf5-3aec595fca96', 'chase@example.com'),
        ('cf1b1ca0-cc0a-4c53-9e38-418e628f9471', 'partner@example.com')
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO public.couples (id, user1_id, user2_id) VALUES
        ('11111111-1111-1111-1111-111111111111', 'a3cc73ea-9c99-42a2-acf5-3aec595fca96', 'cf1b1ca0-cc0a-4c53-9e38-418e628f9471')
      ON CONFLICT (id) DO NOTHING;`,
	},
	// 019 named a table that never existed (option_list_items). In production
	// the statements around it applied and that one failed; 020 fixed it.
	"019_enable_realtime.sql": {
		statementwise: true,
		skip: /option_list_items/,
	},
};

/** A fresh database with every migration applied, as the superuser. */
export async function migratedDb({ upTo } = {}) {
	const db = new PGlite({ extensions: { uuid_ossp } });
	await db.exec(SUPABASE_STANDIN);

	for (const file of MIGRATIONS) {
		if (upTo && file > upTo) break;
		const sql = fs.readFileSync(new URL(file, DIR), "utf8");
		const shim = SHIMS[file];
		if (shim?.before) await db.exec(shim.before);
		if (shim?.statementwise) {
			for (const statement of sql.split(";").map((s) => s.trim())) {
				if (!statement || /^(--[^\n]*\n?)*$/.test(statement)) continue;
				if (shim.skip?.test(statement)) continue;
				await db.exec(statement);
			}
		} else {
			try {
				await db.exec(sql);
			} catch (err) {
				throw new Error(`${file}: ${err.message}`);
			}
		}
	}

	// Supabase grants the API roles table access; RLS is what narrows it.
	await db.exec(`
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  `);
	return db;
}

/** Acts as `uid` through the API role, so RLS applies (null = signed out). */
export async function asUser(db, uid) {
	await db.exec(`RESET ROLE; SELECT set_config('test.uid', '${uid ?? ""}', false)`);
	await db.exec(uid === null ? "SET ROLE anon" : "SET ROLE authenticated");
}

/** Back to the superuser: RLS off, for setup and for reading the truth. */
export async function asAdmin(db) {
	await db.exec("RESET ROLE; SELECT set_config('test.uid', '', false)");
}
