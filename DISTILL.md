# Notes for Distill Agents

Duo Decide is an Expo (React Native) + NativeWind + Supabase app for couples who
decide things together. What the product is and is not: see the Product section
of `readme.md`.

1. Read `CLAUDE.md` before changing anything. Its conventions are the rules here.
2. Every change must pass the checks in `.distill/workflow.json` (the same ones CI runs):
   typecheck, ESLint, Prettier, Jest, and the SQL migration tests.
3. Database changes go in a new numbered file under `supabase/migrations/`. Never edit
   an applied migration. Say in the pull request when a migration must be pushed
   before the code merges.
4. All couple data is scoped to the couple by row-level security. A new table needs
   RLS policies and a SQL test before it ships.
5. iOS is the launch platform. Check new screens for safe areas, the keyboard,
   Dynamic Type and reduced motion, as the existing screens do.
6. Never log or expose secrets. `.env` values and Supabase service keys stay out of
   code, tests and pull requests.
