# Vercel Deployment Guide for Traco Workshop Tracker

## Prerequisites
- GitHub account with repository pushed
- Vercel account (sign up at vercel.com)
- Supabase project credentials

## Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your GitHub repository: `neckttiie090520/tracco-workshop-tracker`

### 2. Configure Environment Variables
In Vercel project settings, add these environment variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Build Settings (Auto-detected)
- Framework Preset: Vite
- Root Directory: `.` (leave empty or use single dot)
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Important:** Make sure "Root Directory" is empty or set to `.` (single dot)

### 4. Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Your app will be available at: `https://your-project.vercel.app`

## Post-Deployment

### Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Environment Variables Update
If you need to update environment variables:
1. Go to Project Settings → Environment Variables
2. Update values
3. Redeploy from Deployments tab

### Automatic Deployments
- Every push to `master` branch will trigger automatic deployment
- Preview deployments for pull requests

## Troubleshooting

### Build Errors
The project has some TypeScript errors that need to be fixed before deployment.
To bypass temporarily, update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "strict": false
  }
}
```

### Database Connection
Ensure Supabase allows connections from Vercel IPs:
1. Go to Supabase Dashboard → Settings → API
2. Check that RLS policies allow your app

### Support
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs