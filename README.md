# Workshop Tracker

A lightweight web application for managing workshops at Chiang Mai University (CMU). Built with React, TypeScript, and Supabase.

## Features

### For Participants
- 🔐 **Google OAuth Authentication** via Supabase Auth
- 📚 **Workshop Discovery** - Browse and register for workshops
- 📝 **Task Submissions** - Submit assignments with file uploads and URLs
- 👥 **Personal Dashboard** - Track registrations and submissions
- 📱 **Mobile-Friendly** - Responsive design with Tailwind CSS
- 📄 **Google Docs Integration** - Embedded workshop materials

### For Administrators
- ⚡ **Admin Dashboard** - Real-time statistics and activity monitoring
- 🏫 **Workshop Management** - Create, edit, and manage workshops
- 👥 **Participant Management** - View registrations and export data
- 🎯 **Random Name Picker** - Interactive tool for selecting participants
- 📊 **Submission Tracking** - Monitor task completions and files
- 📈 **Analytics** - Workshop engagement and participation metrics

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (Database + Auth + Storage)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Google OAuth 2.0

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create `.env.local` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Set up the database**:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the schema from `supabase/schema.sql`

4. **Configure Google OAuth**:
   - In Supabase dashboard, go to Authentication > Providers
   - Enable Google provider and configure OAuth credentials
   - Add your site URL to authorized redirect URIs

5. **Start development server**:
   ```bash
   npm run dev
   ```

   Access the app at http://localhost:3000

## Project Structure

```
src/
├── components/
│   ├── AuthProvider.tsx          # Authentication context provider
│   ├── ProtectedRoute.tsx        # Route protection wrapper
│   └── workshops/
│       ├── WorkshopCard.tsx      # Workshop display card
│       └── RegistrationButton.tsx # Workshop registration component
├── pages/
│   ├── LoginPage.tsx             # Google OAuth login
│   ├── DashboardPage.tsx         # User dashboard
│   ├── WorkshopsPage.tsx         # Workshop listing
│   └── WorkshopDetailPage.tsx    # Workshop details and registration
├── services/
│   ├── supabase.ts              # Supabase client configuration
│   ├── auth.ts                  # Authentication service
│   └── workshops.ts             # Workshop CRUD operations
├── hooks/
│   ├── useAuth.ts               # Authentication state management
│   └── useWorkshops.ts          # Workshop data fetching hooks
└── types/
    └── database.ts              # TypeScript database types
```

## Key Features Implementation

### Authentication Flow
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. Google returns to Supabase callback
4. User profile created/updated automatically
5. Session managed by Supabase client

### Workshop Management
- **Browse Workshops**: Grid view with search and filtering
- **Workshop Details**: Full information with materials and tasks
- **Registration**: One-click register/unregister with real-time updates
- **Participant Tracking**: Live participant counts and limits

### Database Schema
- **Users**: Authentication and profile data
- **Workshops**: Workshop information and settings
- **Workshop Registrations**: Many-to-many participant relationships
- **Tasks**: Workshop assignments and deadlines
- **Submissions**: File uploads and task completions

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Backend (Supabase)
- Database and APIs hosted on Supabase cloud
- Configure Row Level Security policies for data access
- Set up Google OAuth provider in authentication settings

## Architecture Decisions

- **Supabase over Firebase**: Better PostgreSQL support and simpler API
- **React over Vue/Angular**: Component reusability and ecosystem
- **TypeScript**: Type safety for better development experience
- **Tailwind CSS**: Rapid UI development with mobile-first approach
- **Vite over Create React App**: Faster development and build times

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email your system administrator or create an issue in the repository.