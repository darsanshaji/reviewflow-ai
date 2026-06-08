# ReviewFlow AI

ReviewFlow AI is a multi-tenant enterprise reputation management platform built using Next.js, Supabase (PostgreSQL), and TailwindCSS.

It allows business owners to onboard their brand properties, deploy smart QR codes, collect customer ratings (redirecting 4-5 stars to Google; routing 1-3 stars to a private feedback log), monitor staff/branch performance rankings, execute campaigns, run client-side AI sentiment analyses, verify subscription limits, and install the interface as a Progressive Web App (PWA).

---

## Prerequisites

To run and test ReviewFlow AI locally, you need the following installed:
1. **Node.js (v18.x or newer)**: [Download Node.js](https://nodejs.org/)
2. **Supabase Account**: A free database instance from [Supabase](https://supabase.com/) (or run it locally via Supabase CLI).

---

## Getting Started

Follow these steps to set up the project locally:

### 1. Clone & Navigate
If you haven't already, place these files in your workspace directory:
```bash
c:\Users\darsa\Downloads\Antigravity projests
```

### 2. Install Dependencies
Open your terminal (PowerShell, Command Prompt, or terminal of choice) in the project directory and run:
```bash
npm install
```

### 3. Set Up Supabase Database
1. Go to your [Supabase Dashboard](https://database.new) and create a new project.
2. Navigate to the **SQL Editor** tab in Supabase.
3. Open the file [supabase/schema.sql](file:///c:/Users/darsa/Downloads/Antigravity%20projests/supabase/schema.sql), copy its entire contents, paste it into the Supabase SQL editor, and click **Run**. This sets up the schema, functions, triggers, and Row-Level Security (RLS) policies.
4. Next, copy the contents of [supabase/seeds.sql](file:///c:/Users/darsa/Downloads/Antigravity%20projests/supabase/seeds.sql) (which defines roles: Super Admin, Owner, Manager, Receptionist, Staff) and run it in the SQL Editor.

### 4. Configure Environment Variables
1. Duplicate `.env.example` and rename it to `.env.local` in the root directory.
2. Go to your Supabase Project Dashboard -> **Project Settings** -> **API**.
3. Fill in the values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
   *Note: The `SUPABASE_SERVICE_ROLE_KEY` is required for serverless API endpoints `/api/v1/*` to bypass RLS safely and fetch analytics/customer details on behalf of authenticated API clients.*

### 5. Run the Local Development Server
Start the Next.js dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing Key Flows

Once the server is running, you can test the following:

### A. Authentication & Onboarding
1. Go to `/login` to sign up / sign in.
2. After logging in, you will be redirected to the **Business Setup Wizard** (`/dashboard/setup`) if no business has been created yet.
3. Complete the multi-step form (Business Name, Logo/Colors, Google Review URL, Branches, etc.) to initialize your database entries.

### B. Dashboard & Analytics
* Explore the main dashboard at `/dashboard` to view SVG trend graphs (daily/weekly/monthly/yearly).
* Manage QR Codes at `/dashboard/qrs`.
* Monitor staff metrics at `/dashboard/staff`.
* Configure SMS/Email/WhatsApp campaigns at `/dashboard/campaigns`.
* Review your compliance logs, download CSV sheets, and retrieve API keys from settings:
  * Audit logs: `/dashboard/settings/audit-logs`
  * General and White Labeling: `/dashboard/settings`

### C. The Review Funnel (QR Code Scans)
To test how a customer interacts with the system:
1. Scan/open the custom tracking link `/review/t/[trackingId]` or directly go to `/review/[branchId]`.
2. Select a rating:
   * **1-3 Stars (Low Rating Flow)**: Routes the user to a private feedback form requesting contact info, comments, and photo upload. It stores the feedback internally and **never** redirects to public review sites.
   * **4-5 Stars (High Rating Flow)**: Shows a modern Thank You screen with a direct link redirecting the user to your Google Review page.

### D. PWA Installation & Offline Mode
* Click the install icon in the browser address bar to install ReviewFlow AI to your desktop or mobile home screen.
* Disconnect your network to test the **Offline Landing Page** configured via [sw.js](file:///c:/Users/darsa/Downloads/Antigravity%20projests/public/sw.js) and [offline.html](file:///c:/Users/darsa/Downloads/Antigravity%20projests/public/offline.html).

---

## Deployment to Vercel

To host this in production:
1. Initialize git and push the project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Create a GitHub repo and link it:
   git remote add origin <your-repo-url>
   git branch -M main
   git push -u origin main
   ```
2. Connect your GitHub repository to **Vercel** (`vercel.com`).
3. Add the three environment variables defined in `.env.local` to Vercel's environment variable configuration.
4. Deploy!
