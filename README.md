# SmartFeeder Web App

A Next.js application for managing smart livestock feeders with remote monitoring and control capabilities.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Supabase (PostgreSQL database, Authentication)
- **Package Manager:** pnpm
- **Hosting:** Vercel
- **Payments:** Stripe
- **Analytics:** Vercel Analytics

## Admin Functionality

The application includes an admin system for managing commissioned feeder devices:

### Setting Up Admin Users

To grant admin privileges to a user:

1. **Via Supabase Dashboard:**
   - Go to Authentication → Users
   - Find the user and edit their details
   - Set `raw_app_meta_data` to: `{"is_admin": true}`

2. **Via SQL:**
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = '{"is_admin": true}'::jsonb
   WHERE email = 'admin@example.com';
   ```

### Admin Features

- **Commission Feeders:** Add device IDs that users can claim
- **Manage Devices:** View, edit, and delete commissioned devices
- **Bulk Operations:** Upload multiple device IDs at once
- **Device Validation:** Only commissioned device IDs can be used by users
- **Single Ownership:** Each device can only be owned by one user at a time

### Device Validation Flow

1. Admin commissions device IDs via admin panel
2. Users can only create feeders with commissioned device IDs
3. System validates device ID exists in commissioned feeders table
4. Each device can only be assigned to one user (unique constraint enforced)
5. Users can share access to feeders through the permissions system

## Development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables (see `.env.example`)

3. Start Supabase:

   ```bash
   pnpm supabase start
   ```

4. Run database migrations:

   ```bash
   pnpm supabase db push
   ```

5. Start development server:
   ```bash
   pnpm dev
   ```

## Database Schema

- `feeders` - User-owned feeder devices
- `commissioned_feeders` - Admin-managed list of valid device IDs
- `feeding_schedules` - Automated feeding schedules
- `feeding_sessions` - Individual feeding times within schedules
- `sensor_data` - IoT sensor readings

## Security

- Row Level Security (RLS) enabled on all tables
- Admin access controlled via JWT `app_metadata.is_admin`
- Device validation prevents unauthorized feeder creation

## Development Workflow

This project uses Husky for git hooks to ensure code quality:

- **Pre-commit hooks**: Automatically runs tests, linting, and build verification before each commit
- All tests must pass, code must be lint-free, and project must build successfully before commits are allowed
- This prevents failed Vercel deployments by catching build issues early
