# Supabase Setup Guide

This guide explains how to set up Supabase for the Duo Decide app.

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Getting Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select an existing one
3. Go to Settings > API
4. Copy the Project URL and anon/public key
5. Add them to your `.env.local` file

## Database Schema Setup

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `schema.sql` from this project
4. Run the SQL script to create all tables, policies, and triggers

## Database Schema Overview

The database consists of the following main tables:

### `couples`

- Stores user relationships (couples)
- Each couple has two users: `user1_id` and `user2_id`
- Enforces that each user can only be in one couple

### `decisions`

- Stores decision data
- Links to couples via `couple_id`
- Tracks creator, partner, status, and completion info
- Supports both 'vote' and 'poll' types

### `decision_options`

- Stores options for each decision
- Links to decisions via `decision_id`
- Tracks vote counts and elimination rounds

### `votes`

- Stores individual votes
- Links to decisions, users, and options
- Supports round-based voting for polls
- Enforces one vote per user per round per decision

### `option_lists`

- Stores reusable option templates
- Linked to couples for sharing
- Used to create decisions with pre-defined options

### `option_list_items`

- Stores individual items within option lists
- Links to option lists via `option_list_id`

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:

- Users can only access data from their couple
- Users can only create/modify their own decisions and votes
- Partners can view each other's decisions and votes
- Vote privacy is maintained (votes are hidden until both partners complete a round)

## Real-time Features

The following tables are enabled for real-time updates:

- `decisions` - Live updates when decisions are created/modified
- `decision_options` - Live updates when options are added/removed
- `votes` - Live updates when votes are submitted
- `couples` - Live updates when couple relationships change

## Development Workflow

1. Set up environment variables
2. Run the schema.sql script in Supabase
3. Test database operations using the functions in `lib/database.ts`
4. Use the TypeScript interfaces in `types/database.ts` for type safety

## Testing

To test the database setup:

1. Create a couple using `createCouple()`
2. Create a decision using `createDecision()`
3. Submit votes using `submitVote()`
4. Verify real-time updates work with `subscribeToDecisions()`

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure your user is authenticated and part of a couple
2. **Foreign Key Errors**: Make sure referenced records exist before creating dependent records
3. **Permission Errors**: Check that your Supabase project has the correct policies enabled

### Debug Mode

Set `EXPO_PUBLIC_DEBUG=true` in your environment variables to enable debug logging for database operations.

## Production Considerations

1. **Backup**: Set up regular database backups in Supabase
2. **Monitoring**: Monitor database performance and usage
3. **Scaling**: Consider connection pooling for high-traffic scenarios
4. **Security**: Regularly review and update RLS policies
