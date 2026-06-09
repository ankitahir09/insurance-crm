import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  policyId?: mongoose.Types.ObjectId;
  action: 
    | 'ONE_TAP_RENEW' 
    | 'CRON_REMINDER_SENT' 
    | 'MUTED_ALERTS' 
    | 'UNMUTED_ALERTS' 
    | 'SYSTEM_INIT'
    | 'MANUAL_EMAIL_DISPATCH'
    | 'MANUAL_WHATSAPP_DISPATCH'
    | 'BROADCAST_EMAIL'
    | 'BROADCAST_WHATSAPP';
  channel: 'Email' | 'WhatsApp' | 'System';
  recipient: string;
  status: 'Success' | 'Failed';
  details: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
  policyId: { type: Schema.Types.ObjectId, ref: 'Policy', required: false, index: true },
  action: { 
    type: String, 
    enum: [
      'ONE_TAP_RENEW', 
      'CRON_REMINDER_SENT', 
      'MUTED_ALERTS', 
      'UNMUTED_ALERTS', 
      'SYSTEM_INIT',
      'MANUAL_EMAIL_DISPATCH',
      'MANUAL_WHATSAPP_DISPATCH',
      'BROADCAST_EMAIL',
      'BROADCAST_WHATSAPP'
    ],
    required: true 
  },
  channel: { 
    type: String, 
    enum: ['Email', 'WhatsApp', 'System'], 
    required: true 
  },
  recipient: { type: String, default: '' },
  status: { type: String, enum: ['Success', 'Failed'], required: true },
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true },
});

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
