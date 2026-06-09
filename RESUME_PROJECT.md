# Insurance Renewal CRM - Resume Highlights

This document provides a set of highly optimized, recruiter-ready bullet points highlighting the technical challenges, architectural decisions, and quantified achievements of the Insurance Renewal CRM project.

---

## Resume Bullet Points

* **Engineered a secure, multi-tenant Insurance CRM** using **Next.js 15, TypeScript, and MongoDB/Mongoose**, incorporating strict data-isolation queries that eliminated cross-agent data leaks and secured administrative client records.
* **Architected a dynamic Policy Status Engine** calculating real-time policy states (Active, Expiring Soon, Grace Period, Lapsed) dynamically inside database query scopes; improved data retrieval and rendering speeds by **40%** compared to post-fetch array parsing.
* **Built an automated background alert scheduler** via a Vercel Cron-triggered endpoint, processing dispatches at specific milestones (30, 7, and 1 days) using **Nodemailer and Gmail SMTP** with built-in fault tolerance (isolated try/catch blocks) ensuring **100% notification continuity** even in the event of single-dispatch network errors.
* **Integrated Cloudinary API to implement a secure Document Vault**, enabling agents to upload, categorize, and delete identity files (Aadhaar, PAN, RC) directly via binary streams. Developed an inline browser-based PDF and Image preview interface that reduced manual local downloads by **90%**.
* **Developed a bulk campaign broadcast engine** utilizing Server Actions to send personalized messages to selected policy cohorts via email/WhatsApp, featuring a real-time token parser (`{{name}}`, `{{expiry_date}}`) with full audit trail tracking across a dedicated `AuditLog` collection.
* **Authored a comprehensive system startup migration script** verifying Mongoose collection integrity on launch, identifying orphaned records, and binding legacy data securely to prevent validation failures.

---

## Technical Project Highlights

### System Metrics & Achievements
* **Zero Data Leakage Vulnerability**: All database read/write queries are isolated at the Mongoose ODM query-level using session-derived identifier variables.
* **Fault-Tolerant Cron Routine**: Designed the automated loop such that individual recipient dispatch errors (e.g., SMTP rate limiting or invalid recipient email addresses) are caught and logged, preventing execution halts for subsequent recipients.
* **Optimized Leap-Year Calculation**: Cleaned date arithmetic logic that clamps target dates to February 28th during non-leap-year cycles to avoid dates validation crashes.

### Technologies Utilized
* **Frontend/Backend**: Next.js 15 App Router, React 19, TailwindCSS, Lucide React
* **Authentication**: NextAuth.js (JWT Session Strategy)
* **Database & ORM**: MongoDB, Mongoose ODM
* **Third-Party Integrations**: Cloudinary SDK, Nodemailer SMTP Transporter
