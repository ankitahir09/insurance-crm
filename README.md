# Insurance Renewal CRM

A modern, high-performance, and secure Next.js Customer Relationship Management (CRM) system engineered for insurance agents. This platform automates the tracking of insurance policies, handles dynamic status computations, stores client identity documents securely, and automates multi-stage email/WhatsApp renewal notifications.

---

## Technical Features

* **Access Control & Multi-Tenant Isolation**: Protected views and API endpoints powered by NextAuth JWT sessions. Strict data-isolation layer ensures logged-in agents can only query, edit, or delete their own assigned clients' policies.
* **Dynamic Policy Engine**: Auto-computes policy lifecycle phases (`Active`, `Expiring Soon`, `Grace Period`, `Lapsed`) dynamically based on real-time expiry dates.
* **Document Vault**: Seamless integration with Cloudinary for uploading, storing, and purging policyholder documents (Aadhaar, PAN, Vehicle RC, policy copies) via custom binary streams, including an inline PDF/Image modal viewer.
* **Automated Renewal Scheduler**: Background daily cron executor (`/api/cron/reminders`) that triggers targeted dispatches for policies expiring in exactly 30, 7, and 1 days, bypassing muted (Do Not Disturb) policyholders.
* **Bulk Occasion Broadcasts**: Server Action pipeline allowing agents to select recipients and dispatch personalized bulk greetings or announcements with real-time text token replacement (`{{name}}`, `{{expiry_date}}`, etc.).
* **Audit Trail**: Every automated trigger, manual dispatch, document upload, database seed, and administration configuration is tracked in a centralized `AuditLog` collection.

---

## Tech Stack

* **Framework**: Next.js 15 (App Router, Server Actions, API Routes)
* **Language**: TypeScript
* **Database**: MongoDB (via Mongoose ODM)
* **Authentication**: NextAuth.js (Credentials Provider)
* **Storage**: Cloudinary API (Media & Documents Storage)
* **Notifications**: Nodemailer (via Gmail SMTP Transporter)
* **Icons & UI**: TailwindCSS, Lucide Icons, Shadcn-inspired custom design

---

## Project Structure

```text
├── src/
│   ├── app/                      # Next.js App Router Pages & API Routes
│   │   ├── actions/              # Secure Next.js Server Actions (CRUD, Broadcast)
│   │   ├── api/                  # API Endpoints (Cron reminders, Database seeding)
│   │   ├── login/                # Authentication UI Pages
│   │   ├── profile/              # Admin Profile Management page
│   │   ├── layout.tsx            # Global Layout Wrapper
│   │   └── page.tsx              # CRM Main Dashboard
│   ├── components/               # React Client Components (Dashboard, Forms, Modals)
│   ├── lib/                      # Core Utility Functions & Integrations
│   │   ├── auth.ts               # NextAuth Provider configuration
│   │   ├── db.ts                 # Mongoose Connection Cache & Migrations
│   │   ├── cloudinary.ts         # Cloudinary SDK client setup
│   │   └── services/             # Core Services (Communications, Date Math)
│   └── models/                   # Mongoose Schemas (Admin, Policy, AuditLog)
├── public/                       # Static Assets & Icons
├── Features.md                   # Full Functional Capabilities Blueprint
├── ARCHITECTURE.md               # System Architecture & Diagrams
├── API.md                        # API Endpoint Reference
├── CONTRIBUTING.md               # Git & Workflow Guidelines
└── RESUME_PROJECT.md             # Key Recruiter Highlights & Metrics
```

---

## Local Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18.x or higher)
* [MongoDB](https://www.mongodb.com/try/download/community) running locally (or an Atlas connection string)

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/insurance-crm.git
cd insurance-crm

# Install packages
npm install
```

### 3. Environment Variables Setup
Create a `.env.local` file at the root of the project:
```env
# MongoDB Connection
MONGODB_URI="mongodb://localhost:27017/insurance-crm"

# NextAuth Authentication Config
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-character-random-secret-key"

# Cloudinary Storage Config
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# Gmail SMTP Configuration
EMAIL_USER="your-email@gmail.com"
EMAIL_APP_PASSWORD="your-16-character-google-app-password"

# Cron Security Token
CRON_SECRET="your-development-cron-secret-token"
```

*Note: To obtain a Gmail SMTP `EMAIL_APP_PASSWORD`, enable 2-Step Verification on your Google account, search for "App Passwords", name your application (e.g., `Insurance CRM`), and copy the generated 16-character string.*

---

## Bootstrapping the Database

Since user signup is disabled for security, bootstrap your local MongoDB with a default admin account and client records using either method below:

### Method A: Console Seed Command (Recommended)
```bash
node src/scripts/run-seed.js
```

### Method B: REST Endpoint Seed
1. Start the dev server: `npm run dev`
2. Navigate your web browser to: `http://localhost:3000/api/seed`

### Default Credentials
* **Email**: `admin@agency.com`
* **Password**: `password123`

---

## Running the App

### Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build & Launch
To validate production compiling and run locally:
```bash
npm run build
npm run start
```

---

## Triggering Automated Reminders
In production, the daily Cron scheduler is triggered via a system webhook. To run the automated alerts check manually in development:
```bash
curl -H "Authorization: Bearer your-development-cron-secret-token" http://localhost:3000/api/cron/reminders
```
This triggers a scan for policies expiring in exactly 30, 7, or 1 days, automatically dispatching Gmail alerts and logging stubs in the audit trail.
