# Database Setup Guide

## Option 1: Using Neon Dashboard (Recommended)

1. Go to your [Neon Dashboard](https://console.neon.tech)
2. Select your project
3. Click on "SQL Editor"
4. Copy the contents of `schema.sql`
5. Paste and execute the SQL in the editor
6. Verify tables were created by running: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

## Option 2: Using the Init Script

1. Make sure your `.env.local` has `DATABASE_URL` set
2. Install tsx if not already installed: `npm install -D tsx`
3. Run the init script:
   ```bash
   npm run init-db
   ```

## Option 3: Using psql (if installed)

```bash
psql $DATABASE_URL -f schema.sql
```

## Verify Setup

After running the schema, verify it worked by checking the health endpoint:

```bash
curl http://localhost:3000/api/health
```

You should see `"database": "connected"` in the response.

## Tables Created

- `users` - User accounts synced from Clerk
- `data_sources` - Connected data sources (CSV, Sheets, DB, API)
- `queries` - Query history and results
- `query_packs` - Additional query packs purchased
- `teams` - Team/organization records
- `team_members` - Team membership and roles

## Troubleshooting

If you get errors:
1. Check that `DATABASE_URL` is correct in `.env.local`
2. Ensure your Neon database is active
3. Check that you have proper permissions on the database
4. Verify the schema file is complete (no truncation)






