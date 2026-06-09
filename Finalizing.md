# Local Setup Guide: Finalizing CRM Configuration

This guide details the final configuration steps to run the Insurance CRM locally with fully functional production logic for multi-tenant documents and notifications.

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

# Cron Job Authorization Token
CRON_SECRET=your_secure_cron_token_here
```

> [!IMPORTANT]
> Notice that `EMAIL_USER` and `EMAIL_APP_PASSWORD` are **no longer required in `.env.local`**. The application now uses a multi-tenant dynamic SMTP transporter. Agents must configure their email credentials securely inside their personal Dashboard Profile interface!

---

## 2. Google App Password Setup (Dynamic Gmail SMTP)

To dispatch real emails from an agent's personal or business Gmail account, the agent must generate a secure **App Password** and save it to their profile:

1. **Enable 2-Step Verification**:
   - Go to your [Google Account Settings](https://myaccount.google.com).
   - In the left navigation panel, select **Security**.
   - Under *How you sign in to Google*, click on **2-Step Verification** and follow the prompts to enable it. (Google requires 2-Step Verification to be enabled before generating App Passwords).

2. **Generate an App Password**:
   - Go back to the **Security** tab.
   - Search for **App Passwords** in the top search bar, or scroll to the bottom of the *2-Step Verification* page and select **App Passwords**.
   - Enter a name for the app (e.g., `Insurance CRM`) and click **Create**.

3. **Configure in CRM Profile**:
   - Copy the generated **16-character password** (shown in a yellow box, e.g. `abcd efgh ijkl mnop`).
   - Log into the CRM and navigate to **Profile/Settings**.
   - Paste the password into the "SMTP App Password" field (remove any spaces in the value, e.g. `abcdefghijklmnop`).
   - Enter your Gmail address in the "SMTP Email" field and click **Save**.

---

## 3. Testing the Automated Cron Endpoint

The system includes a daily background scheduler (`src/app/api/cron/reminders/route.ts`) that runs automatically in production. To test it manually on `localhost`:

1. Ensure your development server is running (`npm run dev`).
2. Open a new terminal and run a curl request, or use Postman/Browser to hit the endpoint:
   ```bash
   curl http://localhost:3000/api/cron/reminders
   ```
3. Check your application terminal to see the `[CRON]` logs scanning for expiring policies and triggering the dynamic transporter for notifications!

---

## 4. Database Seeding & Admin User Creation

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

### Default Login Credentials
Once seeded, navigate to `http://localhost:3000/login` and log in with the following default admin credentials:
* **Email**: `admin@agency.com`
* **Password**: `password123`
* **Access Level**: Full Administrative Privileges
