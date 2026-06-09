# Technical Blueprint: CRM Feature Specifications

This document serves as the complete technical blueprint of the Insurance Renewal CRM, detailing every module across explicit, production-ready capabilities.

---

## 1. Access Control & Security
- **NextAuth Session Protection**: Secures all dashboard views and Server Actions using the `next-auth` JWT session-based token strategy, restricting access to authenticated users.
- **Strict Tenant Isolation**: All database queries explicitly enforce `{ userId: session.user.id }` bounds to prevent cross-tenant data leakage or unauthorized access to other agents' policy records.
- **Private Administrative Login**: Authenticates administrators against the custom Mongoose `Admin` collection with strict validation of input email and password credentials.
- **Secure Password Hashing via bcryptjs**: Stores credentials with salted bcrypt hashes, avoiding plain-text exposure in the database.
- **Admin Profile Control Action**: Exposes secure server actions (`updateAdminProfileAction`) to modify the administrator's display name, phone number, and verified email address with unique-constraint checks.
- **Secure Password Update Action**: Validates the current password against the stored bcrypt hash before allowing updates (`changeAdminPasswordAction`) to be hashed and written to the database.

---

## 2. Policy Architecture & Management
- **Mongoose Reference Tracking**: Associates every policy securely back to its creator using an indexed `userId` reference to the `Admin` model.
- **Dynamic Status Calculation**: Computes live policy statuses on-the-fly depending on the relation of the expiry date to the current date:
  - **Active**: Policy is valid and has more than 30 days remaining.
  - **Expiring Soon**: Policy is valid and has between 0 and 30 days remaining.
  - **Grace Period**: Policy expired within the last 14 days, representing an active renewal grace phase.
  - **Lapsed**: Policy expired more than 14 days ago without renewal.
- **One-Tap Policy Renewal (+1 Year)**: Implements a server action (`renewPolicyAction`) that updates the policy's expiry date by exactly +1 year, safely handling leap years.
- **Categorized Policy Type Filtering**: Filters list views according to explicit enum options: `Car`, `Health`, `Life`, `Home`, `Travel`, or `Other`.
- **Column Sorting Controls**: Sorts policies in ascending or descending order across any table column, including Holder Name, Policy Number, Policy Type, and Expiry Date.

---

## 3. Advanced Document Vault
- **Type-Safe Document Sub-Schema**: Restricts files to supported types (`PDF`, `Image`, or `Other`) at the database level using a `DocumentItemSchema` with explicit `_id: false` definitions to bypass BSON serialization errors in React Client Components.
- **Multi-File Cloudinary Storage**: Uploads files directly from multipart HTML forms to Cloudinary folders (`insurance_crm_documents`) over raw file upload streams.
- **Explicit Label Schema Mapping**: Links uploaded files to specific document type labels, supporting standard options and optional custom-labeled attachments.
- **Native Browser Preview Modal**: Allows inline viewing of vault documents (PDFs and images) in a unified preview modal with file-switching tabs.
- **Vault Asset Destruction Sync**: Syncs document removals from the vault by triggering Cloudinary's `uploader.destroy` utilizing explicit dynamic type-casting (`resource_type: 'raw'` for PDFs and `'image'` for others), followed by MongoDB array extraction.

---

## 4. Automated Communication Engine
- **Vercel Cron Integration**: Exposes a secure daily cron route (`/api/cron/reminders`) triggered at midnight, protected by a production-only `CRON_SECRET` authorization bearer token.
- **Multi-Tenant Dynamic SMTP Transporter**: Eliminates environment-wide email credentials. Spin up independent Gmail SMTP connection instances on-the-fly for each policy record dynamically fetching the correct `agentEmailSettings` (Host, Port, Credentials) from their respective `Admin` document profile.
- **Milestone-Targeted Notification Logic**: Scans the database daily to select policies expiring in exactly 30, 7, and 1 days, matching them to custom multi-stage reminder templates.
- **Do Not Disturb (DND) Muted Bypass**: Skips automatic reminder dispatches for any policyholder that has the DND setting (`isMuted: true`) toggled on.
- **Fault-Tolerant Loop Processing**: Evaluates each policyholder's email and mobile reminders within independent `try...catch` blocks to prevent single failures (like bad SMTP passwords) from halting the entire cron loop sequence.
- **Crash-Guard Database Auditing**: Intercepts email/WhatsApp transport errors and automatically logs them into the respective user's `AuditLog` space as `Failed` operations without application disruption.

---

## 5. Broadcast System & Audit Trails
- **Multi-Channel Message Blasts**: Supports bulk manual broadcasting (`sendBroadcastAction`) of custom messages (e.g. holiday or policy changes) to selected lists of policyholders over Email and WhatsApp channels simultaneously.
- **Dynamic Text Placeholders**: Resolves dynamic placeholder tokens (`{{name}}`, `{{policy_number}}`, `{{policy_type}}`, `{{expiry_date}}`) into customized text per recipient.
- **Tenant-Bound Audit Logging**: Creates a persistent history trail inside the `AuditLog` collection mapped strictly via an indexed `userId` reference back to the operating admin agent.
- **Persistent Communication Log Trails**: Stores all manual dispatches, daily cron notices, and custom broadcasts recording the `policyId`, `action`, `channel`, `recipient`, `status`, `details`, and `timestamp`.
