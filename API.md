# API & Server Action Contract Reference

This document covers all exposed REST endpoints and Next.js Server Actions (RPC contracts) used by the Insurance CRM.

---

## 1. REST Endpoints

### Database Seeding (`/api/seed`)
Bootstraps the database with default administrator credentials and mock policyholder profiles.

* **Method**: `GET`
* **Access**: Public (Development & Configuration)
* **Response (Success - 200 OK)**:
  ```json
  {
    "success": true,
    "adminCreated": true,
    "message": "Database seeded successfully. Access using: admin@agency.com / password123"
  }
  ```
* **Response (Failure - 500 Internal Server Error)**:
  ```json
  {
    "success": false,
    "message": "Detailed database connection error message..."
  }
  ```

---

### Automated Cron Scheduler (`/api/cron/reminders`)
Scans the database and triggers email alerts and WhatsApp log stubs for expiring policies.

* **Method**: `GET`
* **Access**: Protected by Token (Production authorization checks)
* **Headers**:
  * `Authorization`: `Bearer <CRON_SECRET>`
* **Response (Success - 200 OK)**:
  ```json
  {
    "success": true,
    "processedCount": 1,
    "details": [
      {
        "policyNumber": "POL-LIFE-3000",
        "customerName": "Tony Stark",
        "daysRemaining": 1,
        "email": {
          "recipient": "tony@starkindustries.com",
          "status": "Success",
          "details": "Email sent successfully via Gmail SMTP. ID: <message-id>"
        },
        "whatsapp": {
          "recipient": "+15553000",
          "status": "Success",
          "details": "WhatsApp stub sent successfully. Message: \"...\""
        }
      }
    ]
  }
  ```
* **Response (Unauthorized - 401)**:
  ```text
  Unauthorized
  ```
* **Response (Failure - 500 Internal Server Error)**:
  ```json
  {
    "success": false,
    "error": "Detailed execution crash message..."
  }
  ```

---

## 2. Server Actions Reference

Next.js Server Actions act as secure RPC endpoints. All actions require an active NextAuth session containing the admin's `userId`. If unauthorized, they throw an `Authentication required for this operation` error.

### Policy Operations (`src/app/actions/policy.ts`)

#### `renewPolicyAction(policyId: string)`
Extends the target policy's expiration date by exactly 1 year.
* **Payload**: `policyId` (string)
* **Response (Success)**:
  ```json
  {
    "success": true,
    "expiryDate": "2027-06-07T00:00:00.000Z"
  }
  ```

#### `toggleMuteAction(policyId: string, isMuted: boolean)`
Enables/Disables DND status for automated cron reminders.
* **Payload**: `policyId` (string), `isMuted` (boolean)
* **Response (Success)**:
  ```json
  {
    "success": true,
    "isMuted": true
  }
  ```

#### `sendManualEmailAction(policyId: string)`
Manually dispatches an email alert via Gmail SMTP for the target policy.
* **Payload**: `policyId` (string)
* **Response (Success)**:
  ```json
  {
    "success": true,
    "details": "Email sent successfully via Gmail SMTP. ID: <message-id>"
  }
  ```

#### `sendManualWhatsAppAction(policyId: string)`
Manually logs a whatsapp dispatch stub and registers it in the Audit Trail.
* **Payload**: `policyId` (string)
* **Response (Success)**:
  ```json
  {
    "success": true,
    "details": "WhatsApp reminder processed successfully (Stub)."
  }
  ```

#### `deleteDocumentAction(policyId: string, publicId: string, url: string)`
Deletes the specific document from Cloudinary storage and Mongoose documents array.
* **Payload**: `policyId` (string), `publicId` (string), `url` (string)
* **Response (Success)**:
  ```json
  {
    "success": true
  }
  ```

#### `deletePolicyAction(policyId: string)`
Permanently deletes a policy from MongoDB and purges all its vault files from Cloudinary.
* **Payload**: `policyId` (string)
* **Response (Success)**:
  ```json
  {
    "success": true
  }
  ```

---

### Upload & Management (`src/app/actions/policyUpload.ts`)

#### `createPolicyAction(formData: FormData)`
Creates a new client policy record and uploads any attached files to Cloudinary.
* **Payload**: Multi-part `FormData` body containing:
  * Text fields: `name`, `policyNumber`, `policyType`, `issueDate`, `expiryDate`, `mobileNumber`, `email`, `isMuted`
  * File fields: `doc_Aadhaar Card`, `doc_PAN Card`, `doc_Vehicle RC`, `doc_Current Policy Copy`, `doc_Other` (optional), `otherLabel` (optional)
* **Response (Success)**:
  ```json
  {
    "success": true,
    "policyId": "60a7e02b85c4e4a5d8c687d4"
  }
  ```

#### `updatePolicyAction(formData: FormData)`
Updates policy metadata and appends any newly uploaded documents.
* **Payload**: Multi-part `FormData` containing all fields in `createPolicyAction` plus `id` (policy database ObjectId).
* **Response (Success)**:
  ```json
  {
    "success": true
  }
  ```

---

### Campaign Broadcasts (`src/app/actions/broadcast.ts`)

#### `sendBroadcastAction(data: { policyIds: string[], message: string, channels: ('Email' | 'WhatsApp')[] })`
Dispatches manual campaign announcements to custom cohorts.
* **Payload**:
  ```json
  {
    "policyIds": ["6a193bbb85c4e4a5d8c687d4"],
    "message": "Dear {{name}}, Happy Diwali!",
    "channels": ["Email", "WhatsApp"]
  }
  ```
* **Response (Success)**:
  ```json
  {
    "success": true,
    "successCount": 2,
    "failCount": 0
  }
  ```

---

### Administrative Settings (`src/app/actions/admin.ts`)

#### `updateAdminProfileAction(data: { name: string, email: string, mobile: string })`
Modifies the agent's display name, email, and mobile settings.
* **Payload**:
  ```json
  {
    "name": "Chanakya Adviser",
    "email": "agent@chanakya.com",
    "mobile": "+919876543210"
  }
  ```
* **Response (Success)**:
  ```json
  {
    "success": true,
    "admin": {
      "name": "Chanakya Adviser",
      "email": "agent@chanakya.com",
      "mobile": "+919876543210"
    }
  }
  ```

#### `changeAdminPasswordAction(data: { oldPassword: string, newPassword: string })`
Secures admin profile updates with current password validation.
* **Payload**:
  ```json
  {
    "oldPassword": "password123",
    "newPassword": "newSecurePassword123"
  }
  ```
* **Response (Success)**:
  ```json
  {
    "success": true
  }
  ```
