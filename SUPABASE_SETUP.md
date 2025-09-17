# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `meal-planner-app` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Choose the closest region to your users
6. Click "Create new project"

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## 3. Configure Environment Variables

The `.env.local` file has already been created with your Supabase credentials. If you need to update them:

1. Open the `.env.local` file in your project root
2. Replace the values with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**Note**: The current setup already has working Supabase credentials configured.

## 4. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase-schema.sql` file
4. Click "Run" to execute the SQL

This will create:
- `ingredients` table
- `meals` table  
- `calendar_days` table
- Sample data for testing

## 5. Configure Row Level Security (RLS)

For now, we'll disable RLS for simplicity. In production, you should enable it with proper policies.

1. Go to **Authentication** → **Policies**
2. For each table (`ingredients`, `meals`, `calendar_days`):
   - Click "New Policy"
   - Choose "Allow all operations for all users"
   - Or disable RLS temporarily by going to **Table Editor** → Select table → **Settings** → Toggle off "Enable RLS"

## 6. Test the Connection

1. Start your development server: `npm run dev`
2. Open your app in the browser
3. Try adding an ingredient - it should now save to Supabase!

## 7. Verify Data

1. Go to your Supabase dashboard
2. Navigate to **Table Editor**
3. You should see your tables with the sample data
4. Any new data you add through the app will appear here

## Next Steps

- The app is now connected to Supabase!
- All data will persist between sessions
- You can view and manage data directly in the Supabase dashboard
- Consider setting up proper RLS policies for production use

## Troubleshooting

### Common Issues:

1. **"Invalid API key" error**: Check that your environment variables are correct
2. **"Table doesn't exist" error**: Make sure you ran the SQL schema setup
3. **CORS errors**: Ensure your domain is added to the allowed origins in Supabase settings

### Getting Help:

- Check the [Supabase Documentation](https://supabase.com/docs)
- Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)
