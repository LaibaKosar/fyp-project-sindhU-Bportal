/**
 * Setup script to create initial authorized users
 * Run this once after setting up the database
 * 
 * Note: This requires service role key. For production, create users through Supabase Dashboard
 * or use a server-side script with service role key.
 */

import { createClient } from '@supabase/supabase-js'

// You'll need to set these in your .env file or use Supabase Dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bxdiafrfpvhltprwcqnz.supabase.co'
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY // Service role key (keep secret!)

/**
 * Create initial users
 * This should be run server-side with service role key for security
 */
export async function createInitialUsers() {
  if (!supabaseServiceKey) {
    console.error('Service role key required. Create users manually through Supabase Dashboard.')
    return
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Create TSA user
  // Replace [INSERT YOUR EMAIL HERE] with your actual email
  const tsaEmail = '[INSERT YOUR EMAIL HERE]'
  const { data: tsaUser, error: tsaError } = await supabaseAdmin.auth.admin.createUser({
    email: tsaEmail,
    password: 'Admin123!',
    email_confirm: true,
    user_metadata: { role: 'TSA' }
  })

  if (tsaError) {
    console.error('Error creating TSA user:', tsaError)
  } else if (tsaUser.user) {
    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'TSA' })
      .eq('id', tsaUser.user.id)
    console.log('TSA user created:', tsaEmail)
  }

  // Create U&B_ADMIN user
  const { data: ubAdminUser, error: ubAdminError } = await supabaseAdmin.auth.admin.createUser({
    email: 'ub-dept@sindh.gov.pk',
    password: 'SindhPortal2026!',
    email_confirm: true,
    user_metadata: { role: 'U&B_ADMIN' }
  })

  if (ubAdminError) {
    console.error('Error creating U&B_ADMIN user:', ubAdminError)
  } else if (ubAdminUser.user) {
    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'U&B_ADMIN' })
      .eq('id', ubAdminUser.user.id)
    console.log('U&B_ADMIN user created: ub-dept@sindh.gov.pk')
  }
}

/**
 * Instructions for manual user creation:
 * 
 * 1. Go to Supabase Dashboard > Authentication > Users
 * 2. Click "Add User" > "Create new user"
 * 3. For TSA:
 *    - Email: [Your email]
 *    - Password: Admin123!
 *    - Auto Confirm User: Yes
 *    - User Metadata: { "role": "TSA" }
 * 4. For U&B_ADMIN:
 *    - Email: ub-dept@sindh.gov.pk
 *    - Password: SindhPortal2026!
 *    - Auto Confirm User: Yes
 *    - User Metadata: { "role": "U&B_ADMIN" }
 * 5. The trigger will automatically create profile entries
 * 6. Manually update profiles table to set correct role if needed
 */
