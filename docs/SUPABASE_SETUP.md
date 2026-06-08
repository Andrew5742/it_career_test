# Supabase Setup

## 1. Create a Supabase project

1. Open the Supabase dashboard.
2. Create a new project.
3. Choose the organization, project name, region, and database password.
4. Wait until the project is ready.

## 2. Get URL and anon key

1. Open Project Settings.
2. Go to API.
3. Copy the Project URL.
4. Copy the public anon key.

Do not copy the service_role key into frontend code.

## 3. Create `.env.local`

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart the local dev server after changing env values.

## 4. Run SQL

1. Open the Supabase SQL editor.
2. Paste the contents of `docs/supabase-schema.sql`.
3. Review the schema and RLS policies.
4. Run the SQL.

## 5. Create the first admin user

1. Open Authentication.
2. Create a user with email and password.
3. Copy the user id from the created auth user.
4. Insert an admin profile:

```sql
insert into public.admin_profiles (user_id, email, display_name)
values ('AUTH_USER_ID_HERE', 'admin@example.com', 'Admin');
```

Only users listed in `admin_profiles` should receive admin access to protected data.

## 6. Security note

The frontend must use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
Never paste the Supabase `service_role` key into `.env.local`, React code, Vite config, or any browser-delivered file.
