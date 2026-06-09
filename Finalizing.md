# Local Setup Guide: Finalizing CRM Configuration

This guide details the final configuration steps to run the Insurance CRM locally with fully functional production logic for documents and notifications.

---

## 1. Local Environment Setup

Create or update the `.env.local` file at the root of your project with the following template:

```env
# MongoDB Connection (Local or Atlas)
MONGODB_URI=mongodb://localhost:27017/insurance-crm

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=355e1c0d5a7114b7e8de1cd63750058b # Generate a random secret for production

# Cloudinary Integration (Storage Vault)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Gmail SMTP Settings (Email Alerts via Nodemailer)
EMAIL_USER="your-actual-gmail@gmail.com"
EMAIL_APP_PASSWORD="your-16-character-google-app-password"
```

> [!IMPORTANT]
> Ensure all Cloudinary and Nodemailer environment variables are fully configured in `.env.local`. If either Cloudinary credentials or Gmail SMTP keys are missing or invalid, document uploads/deletions and email reminders will fail and log errors to the Audit Trail.

---

## 2. Google App Password Setup (Gmail SMTP)

To dispatch real emails from your personal or business Gmail account, you must generate a secure **App Password**. Follow these steps:

1. **Enable 2-Step Verification**:
   - Go to your [Google Account Settings](https://myaccount.google.com).
   - In the left navigation panel, select **Security**.
   - Under *How you sign in to Google*, click on **2-Step Verification** and follow the prompts to enable it. (Google requires 2-Step Verification to be enabled before generating App Passwords).

2. **Generate an App Password**:
   - Go back to the **Security** tab.
   - Search for **App Passwords** in the top search bar, or scroll to the bottom of the *2-Step Verification* page and select **App Passwords**.
   - Enter a name for the app (e.g., `Insurance CRM Local`) and click **Create**.

3. **Configure Environment Variables**:
   - Copy the generated **16-character password** (shown in a yellow box, e.g. `abcd efgh ijkl mnop`).
   - Paste the password into your `.env.local` file as `EMAIL_APP_PASSWORD` (remove any spaces in the value, e.g. `abcdefghijklmnop`).
   - Enter your Gmail address in `EMAIL_USER`.

---

## 3. Database Seeding & Admin User Creation

Since there is no public sign-up form, you must run the seeding script to create the initial admin credentials and default mock customer profiles.

You can bootstrap your database using either of the following two methods:

### Method A: Standalone Terminal Command (Recommended)
Run the Node script from your project root to connect directly and seed the database using your environment settings:
```bash
node src/scripts/run-seed.js
```

### Method B: Seed API Endpoint
With your development server running (`npm run dev`), open your web browser and navigate to:
```
http://localhost:3000/api/seed
```
This endpoint will automatically trigger the database bootstrap sequence and return a JSON success message.

### Default Login Credentials
Once seeded, navigate to `http://localhost:3000/login` and log in with the following default admin credentials:
* **Email**: `admin@agency.com`
* **Password**: `password123`
* **Access Level**: Full Administrative Privileges
