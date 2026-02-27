# U&B Portal Setup Instructions

## Database Setup

The database schema has been created with the following tables:
- `roles` - Contains TSA, U&B_ADMIN, and UFP roles
- `universities` - Stores university information
- `profiles` - Links Supabase Auth users to roles and universities

## Environment Variables

Create a `.env` file in the `frontend` directory with:

```
VITE_SUPABASE_URL=https://bxdiafrfpvhltprwcqnz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGlhZnJmcHZobHRwcndjcW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Mjk0NjMsImV4cCI6MjA4NDUwNTQ2M30.jWmRvJeZf2DJQCopE7E9P9Ce36LvDr4hUFCzp9cZSU4
```

## Creating Initial Users

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add User"** > **"Create new user"**

#### Create TSA User:
- **Email**: [Your email address]
- **Password**: `Admin123!`
- **Auto Confirm User**: ✅ Yes
- **User Metadata**: 
  ```json
  {
    "role": "TSA"
  }
  ```

#### Create U&B_ADMIN User:
- **Email**: `ub-dept@sindh.gov.pk`
- **Password**: `SindhPortal2026!`
- **Auto Confirm User**: ✅ Yes
- **User Metadata**: 
  ```json
  {
    "role": "U&B_ADMIN"
  }
  ```

4. After creating users, verify the `profiles` table has entries with correct roles
5. If needed, manually update profiles:
   ```sql
   UPDATE profiles SET role = 'TSA' WHERE email = '[your-email]';
   UPDATE profiles SET role = 'U&B_ADMIN' WHERE email = 'ub-dept@sindh.gov.pk';
   ```

### Option 2: Using SQL (Service Role Required)

If you have the service role key, you can use the `createInitialUsers.js` utility (server-side only).

## Testing the Setup

1. Start the frontend: `npm run dev`
2. Navigate to `/login`
3. Login with `ub-dept@sindh.gov.pk` / `SindhPortal2026!`
4. You should be redirected to `/ub-admin` dashboard
5. Test creating a university account from the dashboard

## Database Schema Summary

### roles
- `id` (SERIAL PRIMARY KEY)
- `role_name` (TEXT UNIQUE)

### universities
- `id` (UUID PRIMARY KEY)
- `name` (TEXT)
- `logo_url` (TEXT, nullable)
- `is_setup_complete` (BOOLEAN, default: false)

### profiles
- `id` (UUID, references auth.users)
- `email` (TEXT)
- `role` (TEXT)
- `university_id` (UUID, references universities, nullable)

## Security Notes

- The `profiles` table has Row Level Security (RLS) enabled
- Users can only view their own profile
- Service role can manage all profiles
- Always use environment variables for sensitive keys
- Never commit `.env` files to version control
