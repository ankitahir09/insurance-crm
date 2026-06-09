"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckSquare,
  Square,
} from "lucide-react";
import { sendBroadcastAction } from "@/app/actions/broadcast";

interface PolicyHolder {
  id: string;
  name: string;
  policyNumber: string;
  policyType: string;
  mobileNumber: string;
  email: string;
}

interface BroadcastFormProps {
  policies: PolicyHolder[];
}

export default function BroadcastForm({ policies }: BroadcastFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState(
    "Dear {{name}},\n\nWishing you and your family a very happy and prosperous Diwali! May this festival of lights bring you joy, peace, and good health.\n\nWarm regards,\nChanakya Advisory Careers",
  );

  const [channels, setChannels] = useState<("Email" | "WhatsApp")[]>([
    "Email",
    "WhatsApp",
  ]);

  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(
    null,
  );

  // Filtering
  const filteredPolicies = policies.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.policyType.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Checkbox handlers
  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPolicies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPolicies.map((p) => p.id));
    }
  };

  const handleToggleChannel = (channel: "Email" | "WhatsApp") => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setStatusType(null);

    if (selectedIds.length === 0) {
      setStatusType("error");
      setStatusMessage("Please select at least one policyholder recipient.");
      return;
    }

    if (channels.length === 0) {
      setStatusType("error");
      setStatusMessage(
        "Please select at least one transmission channel (Email or WhatsApp).",
      );
      return;
    }

    if (message.trim() === "") {
      setStatusType("error");
      setStatusMessage("Please write a message to broadcast.");
      return;
    }

    setPending(true);

    try {
      const result = await sendBroadcastAction({
        policyIds: selectedIds,
        message,
        channels,
      });

      if (result.success) {
        setStatusType("success");
        setStatusMessage(
          `Broadcast completed: ${result.successCount} messages sent successfully, ${result.failCount} failed.`,
        );
        // Reset selections
        setSelectedIds([]);
      }
    } catch (err: any) {
      setStatusType("error");
      setStatusMessage(
        err.message || "An error occurred during the broadcast process.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-neutral-250 pb-4">
        <h2 className="font-mono text-2xl font-black text-neutral-900 tracking-wider uppercase">
          FESTIVAL & OCCASION BROADCASTS
        </h2>
        <p className="text-neutral-500 text-xs font-mono tracking-wide mt-1">
          BULK COMMUNICATION SYSTEM DISPATCH FOR CLIENT ENGAGEMENT
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Composer and Channels (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSendBroadcast}
            className="bg-white border border-neutral-200 p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
              <Users className="w-5 h-5 text-orange-600" />
              <h3 className="font-mono text-sm font-black text-neutral-900 uppercase tracking-wider">
                BROADCAST MESSAGE COMPOSER
              </h3>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                CUSTOM CAMPAIGN MESSAGE //
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={8}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono placeholder-neutral-400 leading-relaxed rounded-none"
                placeholder="Type your greeting message here..."
              />
            </div>

            {/* Channels and Dispatch Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  TRANSMISSION CHANNELS //
                </label>
                <div className="flex space-x-4">
                  {/* Email Channel */}
                  <button
                    type="button"
                    onClick={() => handleToggleChannel("Email")}
                    className={`flex items-center space-x-2 px-4 py-2.5 border font-mono text-xs font-bold uppercase transition-colors min-h-[44px] ${
                      channels.includes("Email")
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-550 border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>EMAIL</span>
                  </button>

                  {/* WhatsApp Channel */}
                  <button
                    type="button"
                    onClick={() => handleToggleChannel("WhatsApp")}
                    className={`flex items-center space-x-2 px-4 py-2.5 border font-mono text-xs font-bold uppercase transition-colors min-h-[44px] ${
                      channels.includes("WhatsApp")
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-550 border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>WHATSAPP</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  SELECTION METRIC //
                </label>
                <div className="flex items-center h-[44px] border border-neutral-200 px-4 bg-neutral-50 font-mono text-xs">
                  <span>
                    RECIPIENTS STAGED:{" "}
                    <strong className="text-orange-600 font-extrabold">
                      {selectedIds.length}
                    </strong>{" "}
                    / {policies.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Reports */}
            {statusMessage && (
              <div
                className={`p-4 border font-mono text-xs ${
                  statusType === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-850"
                    : "bg-red-50 border-red-200 text-red-850"
                } flex items-start space-x-2 animate-fade-in`}
              >
                {statusType === "success" ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{statusMessage}</span>
              </div>
            )}

            {/* Submit button */}
            <div className="flex justify-end border-t border-neutral-100 pt-4">
              <button
                type="submit"
                disabled={pending}
                className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-mono font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-all duration-200 shadow disabled:opacity-50 rounded-none min-h-[44px]"
              >
                {pending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>LAUNCHING BROADCAST...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>DISPATCH CAMPAIGN BROADCAST</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Recipient list (Col 3) */}
        <div className="space-y-6">
          {/* Templates Guide */}
          <div className="bg-white border border-neutral-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-2.5">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <h3 className="font-mono text-xs font-black text-neutral-900 uppercase tracking-widest">
                DYNAMIC CODES //
              </h3>
            </div>
            <p className="font-mono text-xs text-neutral-500 leading-relaxed">
              These placeholders will dynamically resolve per recipient:
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="bg-neutral-50 border p-1.5">
                <code className="font-bold text-orange-600">{"{{name}}"}</code>
              </div>
              <div className="bg-neutral-50 border p-1.5">
                <code className="font-bold text-orange-600">
                  {"{{policy_number}}"}
                </code>
              </div>
              <div className="bg-neutral-50 border p-1.5">
                <code className="font-bold text-orange-600">
                  {"{{policy_type}}"}
                </code>
              </div>
              <div className="bg-neutral-50 border p-1.5">
                <code className="font-bold text-orange-600">
                  {"{{expiry_date}}"}
                </code>
              </div>
            </div>
          </div>

          {/* Active Recipients List */}
          <div className="bg-white border border-neutral-200 shadow-sm flex flex-col max-h-[500px]">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <h4 className="font-mono text-xs font-black text-neutral-900 uppercase tracking-wider">
                ACTIVE RECIPIENTS
              </h4>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-mono text-orange-600 hover:text-orange-700 uppercase font-bold"
              >
                {selectedIds.length === filteredPolicies.length
                  ? "Clear All"
                  : "Select All"}
              </button>
            </div>

            <div className="p-3 border-b border-neutral-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by name..."
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono placeholder-neutral-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {filteredPolicies.length === 0 ? (
                <p className="text-center py-6 font-mono text-xs text-neutral-400">
                  NO ACTIVE POLICIES
                </p>
              ) : (
                filteredPolicies.map((p) => {
                  const isChecked = selectedIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectRow(p.id)}
                      className="p-3 hover:bg-neutral-50 transition-colors flex items-center space-x-3 cursor-pointer select-none"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-orange-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-300 shrink-0" />
                      )}
                      <div className="font-mono text-xs truncate">
                        <p className="font-bold text-neutral-900 truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate">
                          {p.policyType} // {p.policyNumber}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
