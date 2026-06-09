"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertOctagon,
  BellOff,
  Bell,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Hash,
  Mail,
  Calendar,
  Loader2,
  X,
  Plus,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  renewPolicyAction,
  toggleMuteAction,
  sendManualEmailAction,
  sendManualWhatsAppAction,
  deleteDocumentAction,
  deletePolicyAction,
} from "@/app/actions/policy";
import {
  createPolicyAction,
  updatePolicyAction,
} from "@/app/actions/policyUpload";

export interface DocumentItem {
  url: string;
  type: "PDF" | "Image" | "Other";
  label?: string;
  publicId?: string;
}

export interface PolicyData {
  id: string;
  name: string;
  policyNumber: string;
  policyType: "Car" | "Health" | "Life" | "Home" | "Travel" | "Other";
  issueDate: string;
  expiryDate: string;
  mobileNumber: string;
  email: string;
  documents: DocumentItem[];
  isMuted: boolean;
}

export interface LogData {
  id: string;
  policyId: string | null;
  action: string;
  channel: string;
  recipient: string;
  status: string;
  details: string;
  timestamp: string;
}

interface DashboardProps {
  initialPolicies: PolicyData[];
  initialLogs: LogData[];
}

export default function Dashboard({
  initialPolicies,
  initialLogs,
}: DashboardProps) {
  const router = useRouter();
  const [policies, setPolicies] = useState<PolicyData[]>(initialPolicies);
  const [logs, setLogs] = useState<LogData[]>(initialLogs);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "expiryDate" | "status">(
    "expiryDate",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modals Staging State
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<PolicyData | null>(null);
  const [previewDocs, setPreviewDocs] = useState<DocumentItem[] | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [deletingDocUrl, setDeletingDocUrl] = useState<string | null>(null);

  // Transition and Loading Indicators
  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [commsLoadingId, setCommsLoadingId] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [editPending, setEditPending] = useState(false);

  // Operation status message overlays
  const [statusMessage, setStatusMessage] = useState<{
    id: string;
    success: boolean;
    text: string;
  } | null>(null);

  // Sync props to state when server refetches
  useEffect(() => {
    setPolicies(initialPolicies);
  }, [initialPolicies]);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  // Date and status calculators
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysDiff = (dateStr: string) => {
    const expiry = new Date(dateStr);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPolicyStatus = (dateStr: string) => {
    const diff = getDaysDiff(dateStr);
    if (diff < 0) {
      return diff >= -14 ? "Grace Period" : "Lapsed";
    }
    return diff < 30 ? "Expiring Soon" : "Active";
  };

  // Metrics Calculations
  const activeCount = policies.filter(
    (p) => new Date(p.expiryDate) >= today,
  ).length;
  const upcomingCount = policies.filter((p) => {
    const diff = getDaysDiff(p.expiryDate);
    return diff >= 0 && diff < 30;
  }).length;
  const lapsedCount = policies.filter((p) => {
    const diff = getDaysDiff(p.expiryDate);
    return diff < 0 && diff < -14;
  }).length;

  // Urgent Alerts (7 days check)
  const urgentPolicies = policies.filter((p) => {
    const diff = getDaysDiff(p.expiryDate);
    return diff >= 0 && diff <= 7 && !p.isMuted;
  });

  // Action: One-Tap Renew
  const handleRenew = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionLoadingId(id);
    startTransition(async () => {
      try {
        const result = await renewPolicyAction(id);
        if (result.success) {
          setPolicies((prev) =>
            prev.map((p) => {
              if (p.id === id) {
                return { ...p, expiryDate: result.expiryDate };
              }
              return p;
            }),
          );
          router.refresh();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to renew policy");
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Action: Toggle Mute Alerts (DND)
  const handleToggleMute = async (
    id: string,
    currentMuted: boolean,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    setActionLoadingId(id);
    startTransition(async () => {
      try {
        const result = await toggleMuteAction(id, !currentMuted);
        if (result.success) {
          setPolicies((prev) =>
            prev.map((p) => {
              if (p.id === id) {
                return { ...p, isMuted: result.isMuted };
              }
              return p;
            }),
          );
          router.refresh();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to toggle DND");
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Action: Manual Email Dispatch
  const handleManualEmail = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCommsLoadingId(`${id}-email`);
    setStatusMessage(null);
    try {
      const res = await sendManualEmailAction(id);
      setStatusMessage({ id, success: res.success, text: res.details });
      router.refresh();
    } catch (err: any) {
      setStatusMessage({
        id,
        success: false,
        text: err.message || String(err),
      });
    } finally {
      setCommsLoadingId(null);
    }
  };

  // Action: Manual WhatsApp Dispatch
  const handleManualWhatsApp = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCommsLoadingId(`${id}-wa`);
    setStatusMessage(null);
    try {
      const res = await sendManualWhatsAppAction(id);
      setStatusMessage({ id, success: res.success, text: res.details });
      router.refresh();
    } catch (err: any) {
      setStatusMessage({
        id,
        success: false,
        text: err.message || String(err),
      });
    } finally {
      setCommsLoadingId(null);
    }
  };

  // Action: Delete Policyholder Record
  const handleDeletePolicy = async (
    id: string,
    name: string,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to completely delete the policy for "${name}"?\nThis will permanently delete all associated documents.`,
      )
    ) {
      return;
    }

    setActionLoadingId(id);
    startTransition(async () => {
      try {
        const result = await deletePolicyAction(id);
        if (result.success) {
          setPolicies((prev) => prev.filter((p) => p.id !== id));
          router.refresh();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete policy");
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  // Action: Delete Document from Vault
  const handleDeleteDoc = async (policyId: string, doc: DocumentItem) => {
    if (
      !confirm(
        `Are you sure you want to delete the document "${doc.label || "Document"}"?`,
      )
    ) {
      return;
    }

    if (doc.publicId) {
      setDeletingDocId(doc.publicId);
    } else {
      setDeletingDocUrl(doc.url);
    }

    try {
      const res = await deleteDocumentAction(
        policyId,
        doc.publicId || "",
        doc.url,
      );
      if (res.success) {
        setPolicies((prev) =>
          prev.map((p) => {
            if (p.id === policyId) {
              return {
                ...p,
                documents: p.documents.filter((d) => {
                  if (d.publicId && doc.publicId) {
                    return d.publicId !== doc.publicId;
                  }
                  return d.url !== doc.url;
                }),
              };
            }
            return p;
          }),
        );
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeletingDocId(null);
      setDeletingDocUrl(null);
    }
  };

  // Form submit: Add Policy Holder
  const handleAddPolicySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createPolicyAction(formData);
      if (result.success) {
        setIsAddModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Failed to create policy");
    } finally {
      setAddPending(false);
    }
  };

  const handleEditClick = (policy: PolicyData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditPolicy(policy);
    setIsEditModalOpen(true);
    setSelectedPolicyId(null);
  };

  // Form submit: Edit Policy Holder
  const handleEditPolicySubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setEditPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await updatePolicyAction(formData);
      if (result.success) {
        setIsEditModalOpen(false);
        setEditPolicy(null);
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update policy");
    } finally {
      setEditPending(false);
    }
  };

  // Sorting Handler
  const handleSort = (field: "name" | "expiryDate" | "status") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Filtered Policies
  const filteredPolicies = policies
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.policyNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "All" || p.policyType === typeFilter;
      const matchesStatus =
        statusFilter === "All" ||
        getPolicyStatus(p.expiryDate) === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      let aVal: any = a[sortBy as keyof typeof a];
      let bVal: any = b[sortBy as keyof typeof b];

      if (sortBy === "status") {
        aVal = getPolicyStatus(a.expiryDate);
        bVal = getPolicyStatus(b.expiryDate);
      }

      if (sortBy === "expiryDate") {
        aVal = new Date(a.expiryDate).getTime();
        bVal = new Date(b.expiryDate).getTime();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId);
  const selectedPolicyLogs = logs.filter(
    (l) => l.policyId === selectedPolicyId,
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-250 pb-4">
        <div>
          <h2 className="font-mono text-2xl font-black text-neutral-900 tracking-wider uppercase">
            POLICY CONTROL PANEL
          </h2>
          <p className="text-neutral-500 text-xs font-mono tracking-wide mt-1">
            VER. 1.1.0 // CLOUDINARY INTEGRATION // AUDIT LOG DISPATCHES
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center">
          {/* Add Policy trigger */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>ADD POLICYHOLDER</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
          <span className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest">
            ACTIVE POLICIES //
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-4xl font-extrabold text-neutral-900 tracking-tight">
              {activeCount}
            </span>
            <span className="text-xs font-mono text-emerald-600 font-bold uppercase tracking-wider flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ONLINE
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-orange-500" />
          <span className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest">
            UPCOMING RENEWALS (30D) //
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-4xl font-extrabold text-neutral-900 tracking-tight">
              {upcomingCount}
            </span>
            <span className="text-xs font-mono text-orange-600 font-bold uppercase tracking-wider flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" /> RETRIEVING
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600" />
          <span className="font-mono text-xs font-bold text-neutral-400 uppercase tracking-widest">
            LAPSED POLICIES //
          </span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-4xl font-extrabold text-neutral-900 tracking-tight">
              {lapsedCount}
            </span>
            <span className="text-xs font-mono text-red-600 font-bold uppercase tracking-wider flex items-center">
              <AlertOctagon className="w-3.5 h-3.5 mr-1" /> EXPIRED
            </span>
          </div>
        </div>
      </div>

      {/* 3. Urgent Alert Component (Due in 7 Days) */}
      {urgentPolicies.length > 0 && (
        <section className="bg-orange-50 border border-orange-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-orange-600" />
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 animate-pulse" />
            <h3 className="font-mono text-sm font-black text-orange-950 uppercase tracking-wider">
              CRITICAL: RENEWALS DUE WITHIN 7 DAYS ({urgentPolicies.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentPolicies.map((policy) => {
              const days = getDaysDiff(policy.expiryDate);
              return (
                <div
                  key={policy.id}
                  onClick={() => setSelectedPolicyId(policy.id)}
                  className="bg-white border border-orange-200 p-4 flex flex-col justify-between hover:border-orange-500 hover:shadow-md transition-all cursor-pointer relative"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-mono font-bold text-sm text-neutral-900">
                        {policy.name}
                      </span>
                      <span className="text-[10px] bg-orange-600 text-white font-mono px-2 py-0.5 uppercase font-bold">
                        {days} {days === 1 ? "DAY" : "DAYS"} LEFT
                      </span>
                    </div>
                    <div className="text-xs font-mono text-neutral-500 mt-1">
                      <span>No: {policy.policyNumber}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5">
                      {policy.policyType}
                    </span>
                    <button
                      onClick={(e) => handleRenew(policy.id, e)}
                      disabled={actionLoadingId === policy.id}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-bold uppercase transition-colors flex items-center justify-center min-h-[36px]"
                    >
                      {actionLoadingId === policy.id ? (
                        <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>RENEW</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Main Database Section */}
      <div className="bg-white border border-neutral-200 shadow-sm overflow-hidden">
        {/* Search, Filter, Sort Controls */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search holder name or policy number..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono placeholder-neutral-400 rounded-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-neutral-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-neutral-200 px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500"
              >
                <option value="All">TYPE: ALL</option>
                <option value="Car">Car</option>
                <option value="Health">Health</option>
                <option value="Life">Life</option>
                <option value="Home">Home</option>
                <option value="Travel">Travel</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-neutral-200 px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-500"
              >
                <option value="All">STATUS: ALL</option>
                <option value="Active">Active</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Grace Period">Grace Period</option>
                <option value="Lapsed">Lapsed</option>
              </select>
            </div>

            {(searchTerm || typeFilter !== "All" || statusFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("All");
                  setStatusFilter("All");
                }}
                className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-100 text-xs font-mono uppercase transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* 4a. Desktop Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50 font-mono text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <th
                  onClick={() => handleSort("name")}
                  className="px-6 py-3 cursor-pointer hover:text-neutral-900 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>HOLDER NAME</span>
                    {sortBy === "name" ? (
                      sortOrder === "asc" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      )
                    ) : null}
                  </div>
                </th>
                <th className="px-6 py-3">POLICY NO.</th>
                <th className="px-6 py-3">TYPE</th>
                <th
                  onClick={() => handleSort("expiryDate")}
                  className="px-6 py-3 cursor-pointer hover:text-neutral-900 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>EXPIRY DATE</span>
                    {sortBy === "expiryDate" ? (
                      sortOrder === "asc" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      )
                    ) : null}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="px-6 py-3 cursor-pointer hover:text-neutral-900 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>STATUS</span>
                    {sortBy === "status" ? (
                      sortOrder === "asc" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      )
                    ) : null}
                  </div>
                </th>
                <th className="px-6 py-3 text-right">OPERATIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 font-mono text-xs">
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-neutral-400 uppercase tracking-widest"
                  >
                    NO RECORDS REGISTERED
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => {
                  const status = getPolicyStatus(policy.expiryDate);

                  let statusStyle =
                    "bg-emerald-50 text-emerald-800 border-emerald-250";
                  if (status === "Expiring Soon")
                    statusStyle =
                      "bg-orange-50 text-orange-800 border-orange-250";
                  if (status === "Grace Period")
                    statusStyle =
                      "bg-yellow-50 text-yellow-800 border-yellow-250";
                  if (status === "Lapsed")
                    statusStyle = "bg-red-50 text-red-800 border-red-250";

                  const hasDocs =
                    policy.documents && policy.documents.length > 0;

                  return (
                    <tr
                      key={policy.id}
                      onClick={() => setSelectedPolicyId(policy.id)}
                      className="hover:bg-neutral-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-bold text-neutral-900 group-hover:text-orange-600 transition-colors">
                        {policy.name}
                      </td>
                      <td className="px-6 py-4 text-neutral-500">
                        {policy.policyNumber}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 border border-neutral-200">
                          {policy.policyType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {new Date(policy.expiryDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 border font-bold uppercase ${statusStyle}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 text-right flex items-center justify-end space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Live document preview trigger */}
                        {hasDocs && (
                          <button
                            onClick={() => {
                              setPreviewDocs(policy.documents);
                              setActivePreviewIndex(0);
                            }}
                            className="p-1.5 border border-neutral-200 hover:border-neutral-400 text-neutral-500 hover:text-neutral-900 transition-colors flex items-center justify-center bg-white"
                            title="Preview Documents"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Mute alerts toggle */}
                        <button
                          onClick={() =>
                            handleToggleMute(policy.id, policy.isMuted)
                          }
                          disabled={actionLoadingId === policy.id}
                          className={`p-1.5 border transition-all flex items-center justify-center ${
                            policy.isMuted
                              ? "bg-neutral-100 border-neutral-350 text-neutral-400"
                              : "border-neutral-200 text-neutral-600 hover:border-orange-500 hover:text-orange-600 bg-white"
                          }`}
                          title={
                            policy.isMuted
                              ? "Unmute Alerts"
                              : "Mute Alerts (DND)"
                          }
                        >
                          {policy.isMuted ? (
                            <BellOff className="w-3.5 h-3.5" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Edit Policyholder */}
                        <button
                          onClick={(e) => handleEditClick(policy, e)}
                          className="p-1.5 border border-neutral-200 hover:border-orange-500 text-neutral-600 hover:text-orange-600 bg-white transition-all flex items-center justify-center"
                          title="Edit Policyholder"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Policy */}
                        <button
                          onClick={(e) =>
                            handleDeletePolicy(policy.id, policy.name, e)
                          }
                          disabled={actionLoadingId === policy.id}
                          className="p-1.5 border border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 transition-all flex items-center justify-center disabled:opacity-50"
                          title="Delete Policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* One-Tap Renew */}
                        <button
                          onClick={() => handleRenew(policy.id)}
                          disabled={actionLoadingId === policy.id}
                          className="px-2.5 py-1.5 bg-neutral-900 hover:bg-orange-600 hover:text-white text-neutral-100 font-bold uppercase transition-all flex items-center space-x-1"
                        >
                          {actionLoadingId === policy.id ? (
                            <RefreshCcw className="w-3 h-3 animate-spin" />
                          ) : (
                            <span>RENEW</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4b. Mobile Cards Layout */}
        <div className="md:hidden p-4 space-y-4 bg-neutral-50/50">
          {filteredPolicies.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 font-mono text-xs uppercase tracking-widest">
              NO RECORDS REGISTERED
            </div>
          ) : (
            filteredPolicies.map((policy) => {
              const status = getPolicyStatus(policy.expiryDate);

              let statusStyle =
                "bg-emerald-50 text-emerald-800 border-emerald-250";
              if (status === "Expiring Soon")
                statusStyle = "bg-orange-50 text-orange-800 border-orange-255";
              if (status === "Grace Period")
                statusStyle = "bg-yellow-50 text-yellow-800 border-yellow-255";
              if (status === "Lapsed")
                statusStyle = "bg-red-50 text-red-800 border-red-255";

              const hasDocs = policy.documents && policy.documents.length > 0;

              return (
                <div
                  key={policy.id}
                  onClick={() => setSelectedPolicyId(policy.id)}
                  className="bg-white border border-neutral-200 p-4 shadow-sm active:border-orange-500 transition-all flex flex-col space-y-3 relative active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-mono font-black text-sm text-neutral-900">
                        {policy.name}
                      </h4>
                      <p className="font-mono text-[10px] text-neutral-500 uppercase mt-0.5">
                        NO: {policy.policyNumber}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 border font-mono text-[10px] font-bold uppercase ${statusStyle}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-b border-neutral-100 py-2.5 font-mono text-[11px] text-neutral-600">
                    <div>
                      <span className="text-neutral-400 text-[9px] uppercase block">
                        POLICY TYPE
                      </span>
                      <span className="font-bold text-neutral-800">
                        {policy.policyType}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[9px] uppercase block">
                        EXPIRY DATE
                      </span>
                      <span className="font-bold text-neutral-800">
                        {new Date(policy.expiryDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar - Mobile (Touch Targets Min 44x44px) */}
                  <div
                    className="flex flex-col space-y-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      {/* Document previews */}
                      {hasDocs ? (
                        <button
                          onClick={() => {
                            setPreviewDocs(policy.documents);
                            setActivePreviewIndex(0);
                          }}
                          className="w-11 h-11 border border-neutral-200 text-neutral-500 flex items-center justify-center bg-white"
                          title="Preview Documents"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-11 h-11" />
                      )}

                      <div className="flex items-center space-x-2">
                        {/* Mute alerts toggle */}
                        <button
                          onClick={() =>
                            handleToggleMute(policy.id, policy.isMuted)
                          }
                          disabled={actionLoadingId === policy.id}
                          className={`w-11 h-11 border flex items-center justify-center transition-colors ${
                            policy.isMuted
                              ? "bg-neutral-100 border-neutral-350 text-neutral-400"
                              : "border-neutral-200 text-neutral-600 bg-white"
                          }`}
                        >
                          {policy.isMuted ? (
                            <BellOff className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete Policy */}
                        <button
                          onClick={(e) =>
                            handleDeletePolicy(policy.id, policy.name, e)
                          }
                          disabled={actionLoadingId === policy.id}
                          className="w-11 h-11 border border-red-200 hover:border-red-500 text-red-650 bg-white hover:bg-red-550 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
                          title="Delete Policy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleRenew(policy.id)}
                        disabled={actionLoadingId === policy.id}
                        className="py-2.5 bg-neutral-900 active:bg-orange-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider flex items-center justify-center min-h-[44px]"
                      >
                        {actionLoadingId === policy.id ? (
                          <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>RENEW</span>
                        )}
                      </button>

                      <button
                        onClick={(e) => handleEditClick(policy, e)}
                        className="py-2.5 border border-orange-200 hover:border-orange-500 text-orange-600 font-mono text-[9px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1 bg-white min-h-[44px]"
                      >
                        <Pencil className="w-3.5 h-3.5 shrink-0" />
                        <span>EDIT</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Policy Detail & Timeline Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-none w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-scale-in">
            <div className="bg-neutral-950 text-white p-5 flex justify-between items-center border-b border-neutral-800">
              <div>
                <h3 className="font-mono text-sm font-black tracking-widest uppercase">
                  POLICYHOLDER DETAIL PROFILE
                </h3>
                <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  ID: {selectedPolicy.id} // SYSTEM LOG RECORDS
                </p>
              </div>
              <button
                onClick={() => setSelectedPolicyId(null)}
                className="text-neutral-400 hover:text-white p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Profile Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left col: customer info */}
                <div className="space-y-4 border border-neutral-200 p-4 bg-neutral-50/50">
                  <h4 className="font-mono text-xs font-black uppercase text-neutral-400 tracking-wider mb-2 border-b border-neutral-200 pb-1">
                    CUSTOMER METADATA
                  </h4>
                  <div className="flex items-center space-x-2 text-xs font-mono text-neutral-800">
                    <User className="w-4 h-4 text-neutral-450 shrink-0" />
                    <span className="text-neutral-455">NAME:</span>
                    <span className="font-bold">{selectedPolicy.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-neutral-800">
                    <Hash className="w-4 h-4 text-neutral-450 shrink-0" />
                    <span className="text-neutral-455">POL NO:</span>
                    <span className="font-bold">
                      {selectedPolicy.policyNumber}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-neutral-800">
                    <Phone className="w-4 h-4 text-neutral-450 shrink-0" />
                    <span className="text-neutral-455">PHONE:</span>
                    <span className="font-bold">
                      {selectedPolicy.mobileNumber || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-neutral-800">
                    <Mail className="w-4 h-4 text-neutral-450 shrink-0" />
                    <span className="text-neutral-455">EMAIL:</span>
                    <span className="font-bold truncate">
                      {selectedPolicy.email || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Right col: status & dates */}
                <div className="space-y-4 border border-neutral-200 p-4 bg-neutral-50/50">
                  <h4 className="font-mono text-xs font-black uppercase text-neutral-400 tracking-wider mb-2 border-b border-neutral-200 pb-1">
                    COVERAGE SCHEDULER
                  </h4>
                  <div className="flex items-center space-x-2 text-xs font-mono text-neutral-800">
                    <Calendar className="w-4 h-4 text-neutral-455 shrink-0" />
                    <span className="text-neutral-455">ISSUED:</span>
                    <span className="font-bold">
                      {new Date(selectedPolicy.issueDate).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-neutral-800">
                    <Calendar className="w-4 h-4 text-neutral-455 shrink-0" />
                    <span className="text-neutral-455">EXPIRES:</span>
                    <span className="font-bold text-orange-600">
                      {new Date(selectedPolicy.expiryDate).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-neutral-800">
                    <span className="text-neutral-455">STATUS:</span>
                    <span
                      className={`px-2 py-0.5 border font-bold uppercase text-[10px] ${
                        getPolicyStatus(selectedPolicy.expiryDate) === "Active"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : getPolicyStatus(selectedPolicy.expiryDate) ===
                              "Expiring Soon"
                            ? "bg-orange-50 text-orange-800 border-orange-200"
                            : getPolicyStatus(selectedPolicy.expiryDate) ===
                                "Grace Period"
                              ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                              : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      {getPolicyStatus(selectedPolicy.expiryDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Document Vault Grid */}
              <div className="border border-neutral-200 p-4 bg-neutral-50/40">
                <h4 className="font-mono text-xs font-black uppercase text-neutral-900 tracking-wider mb-3 border-b border-neutral-200 pb-1.5 flex justify-between items-center">
                  <span>DOCUMENT VAULT //</span>
                  <span className="text-[10px] font-normal text-neutral-400">
                    {selectedPolicy.documents
                      ? selectedPolicy.documents.length
                      : 0}{" "}
                    ATTACHED
                  </span>
                </h4>
                {selectedPolicy.documents &&
                selectedPolicy.documents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPolicy.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-neutral-200 p-3 flex flex-col justify-between hover:border-orange-500 transition-colors shadow-sm relative group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="font-mono text-xs font-bold text-neutral-800 uppercase truncate"
                              title={doc.label}
                            >
                              {doc.label || `Document #${idx + 1}`}
                            </span>
                            <span
                              className={`font-mono text-[9px] px-1.5 py-0.2 border uppercase font-bold ${
                                doc.type === "PDF"
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
                            >
                              {doc.type}
                            </span>
                          </div>
                          <p
                            className="font-mono text-[9px] text-neutral-400 mt-1 truncate"
                            title={doc.publicId || doc.url}
                          >
                            ID: {doc.publicId || "LOCAL_SIM"}
                          </p>
                        </div>

                        <div className="mt-3.5 flex items-center justify-end space-x-2 border-t border-neutral-100 pt-2">
                          <button
                            onClick={() => {
                              setPreviewDocs([doc]);
                              setActivePreviewIndex(0);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 border border-neutral-200 hover:border-neutral-400 text-neutral-750 font-mono text-[10px] uppercase transition-colors bg-white font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteDoc(selectedPolicy.id, doc)
                            }
                            disabled={
                              deletingDocId === doc.publicId ||
                              deletingDocUrl === doc.url
                            }
                            className="inline-flex items-center space-x-1 px-2.5 py-1 border border-red-200 hover:border-red-550 text-red-600 hover:bg-red-50 font-mono text-[10px] uppercase transition-colors bg-white font-bold disabled:opacity-50"
                          >
                            {(deletingDocId === doc.publicId && doc.publicId) ||
                            (deletingDocUrl === doc.url && !doc.publicId) ? (
                              <RefreshCcw className="w-3.5 h-3.5 animate-spin text-red-500" />
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center font-mono text-xs text-neutral-400 py-6 border border-dashed border-neutral-200 uppercase bg-white">
                    Vault is currently empty.
                  </div>
                )}
              </div>

              {/* Action Operations */}
              <div className="border border-neutral-250 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() =>
                      handleToggleMute(
                        selectedPolicy.id,
                        selectedPolicy.isMuted,
                      )
                    }
                    className={`flex items-center space-x-2 px-4 py-2 border font-mono text-xs font-bold uppercase transition-colors min-h-[40px] ${
                      selectedPolicy.isMuted
                        ? "bg-neutral-100 border-neutral-355 text-neutral-550"
                        : "border-neutral-200 text-neutral-700 hover:border-orange-500 hover:text-orange-600 bg-white"
                    }`}
                  >
                    {selectedPolicy.isMuted ? (
                      <>
                        <BellOff className="w-4 h-4 text-orange-600" />
                        <span>ALERTS MUTED (DND)</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        <span>ALERTS ACTIVE</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleEditClick(selectedPolicy)}
                    className="flex items-center space-x-2 px-4 py-2 border border-orange-200 text-orange-600 hover:bg-orange-50 font-mono text-xs font-bold uppercase transition-colors min-h-[40px] bg-white"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>EDIT PROFILE</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDeletePolicy(
                        selectedPolicy.id,
                        selectedPolicy.name,
                      );
                      setSelectedPolicyId(null);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 border border-red-250 text-red-600 hover:bg-red-50 font-mono text-xs font-bold uppercase transition-all min-h-[40px] bg-white"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>DELETE POLICY</span>
                  </button>
                </div>

                <button
                  onClick={() => handleRenew(selectedPolicy.id)}
                  disabled={actionLoadingId === selectedPolicy.id}
                  className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow min-h-[44px]"
                >
                  {actionLoadingId === selectedPolicy.id ? (
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4" />
                      <span>ONE-TAP RENEW (+1 YR)</span>
                    </>
                  )}
                </button>
              </div>

              {/* History Timeline */}
              <div className="space-y-3">
                <h4 className="font-mono text-xs font-black uppercase text-neutral-900 tracking-wider border-b border-neutral-200 pb-1.5">
                  AUDIT TRAIL HISTORY
                </h4>
                {selectedPolicyLogs.length === 0 ? (
                  <p className="font-mono text-xs text-neutral-400 uppercase italic py-4">
                    NO LOGS FOUND FOR THIS RECORD.
                  </p>
                ) : (
                  <div className="relative border-l border-neutral-200 pl-4 ml-2 space-y-4 pt-1 pb-1">
                    {selectedPolicyLogs.map((log) => {
                      let badgeColor = "bg-neutral-100 text-neutral-700";
                      if (log.status === "Success")
                        badgeColor =
                          "bg-emerald-50 text-emerald-800 border-emerald-250";
                      if (log.status === "Failed")
                        badgeColor = "bg-red-50 text-red-800 border-red-250";

                      return (
                        <div key={log.id} className="relative group">
                          <div
                            className={`absolute left-[-21px] top-1.5 w-2.5 h-2.5 rounded-full border bg-white ${
                              log.status === "Success"
                                ? "border-emerald-500"
                                : "border-red-500"
                            }`}
                          />

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-black text-neutral-800 uppercase">
                                {log.action.replace(/_/g, " ")}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-neutral-100 text-neutral-600 border border-neutral-200">
                                {log.channel}
                              </span>
                              <span
                                className={`font-mono text-[9px] px-1.5 py-0.2 border uppercase ${badgeColor}`}
                              >
                                {log.status}
                              </span>
                              <span className="font-mono text-[10px] text-neutral-400 ml-auto">
                                {new Date(log.timestamp).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                            <p className="font-mono text-xs text-neutral-600 bg-neutral-50 border border-neutral-150 p-2 leading-relaxed">
                              {log.details}
                            </p>
                            {log.recipient && (
                              <p className="font-mono text-[10px] text-neutral-400">
                                RECIPIENT // {log.recipient}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-neutral-50 p-4 border-t border-neutral-200 flex justify-end font-mono text-[10px] text-neutral-400">
              <span>INTERNAL SECURE AGENT PORTAL</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Policy Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-none w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="bg-neutral-950 text-white p-5 flex justify-between items-center border-b border-neutral-800">
              <div>
                <h3 className="font-mono text-sm font-black tracking-widest uppercase">
                  ADD NEW POLICYHOLDER
                </h3>
                <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  SYSTEM REGISTRATION // CLOUDINARY FILE BUFFER STORAGE
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAddPolicySubmit}
              className="p-6 overflow-y-auto space-y-4"
            >
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  HOLDER FULL NAME * //
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="John Doe"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    POLICY NUMBER * //
                  </label>
                  <input
                    type="text"
                    name="policyNumber"
                    required
                    placeholder="POL-HLT-9988"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    POLICY TYPE * //
                  </label>
                  <select
                    name="policyType"
                    required
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  >
                    <option value="Car">Car</option>
                    <option value="Health">Health</option>
                    <option value="Life">Life</option>
                    <option value="Home">Home</option>
                    <option value="Travel">Travel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    ISSUE DATE * //
                  </label>
                  <input
                    type="date"
                    name="issueDate"
                    required
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    EXPIRY DATE * //
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    required
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    MOBILE PHONE //
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    placeholder="+919876543210"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    EMAIL ADDRESS //
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
                  UPLOAD DOCUMENTS TO VAULT //
                </label>
                <div className="space-y-2.5 border border-neutral-200 bg-neutral-50 p-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-600 mb-1">
                      AADHAAR CARD
                    </label>
                    <input
                      type="file"
                      name="doc_Aadhaar Card"
                      accept="application/pdf,image/*"
                      className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-600 mb-1">
                      PAN CARD
                    </label>
                    <input
                      type="file"
                      name="doc_PAN Card"
                      accept="application/pdf,image/*"
                      className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-600 mb-1">
                      VEHICLE RC
                    </label>
                    <input
                      type="file"
                      name="doc_Vehicle RC"
                      accept="application/pdf,image/*"
                      className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-600 mb-1">
                      CURRENT POLICY COPY
                    </label>
                    <input
                      type="file"
                      name="doc_Current Policy Copy"
                      accept="application/pdf,image/*"
                      className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                    />
                  </div>
                  <div className="pt-2 border-t border-neutral-200 mt-2">
                    <label className="block text-[10px] font-mono font-bold text-neutral-650 mb-1">
                      OTHER DOCUMENT
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        name="otherLabel"
                        placeholder="Enter Label (e.g. Driving License)"
                        className="flex-1 px-2 py-1.5 bg-white border border-neutral-200 focus:outline-none focus:border-orange-500 text-[11px] font-mono"
                      />
                      <input
                        type="file"
                        name="doc_Other"
                        accept="application/pdf,image/*"
                        className="text-xs font-mono file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 font-mono mt-1">
                  Upload directly to Cloudinary storage. Accepts PDF and image
                  formats.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  name="isMuted"
                  value="true"
                  id="mute"
                  className="w-4 h-4 accent-orange-600 cursor-pointer"
                />
                <label
                  htmlFor="mute"
                  className="text-xs font-mono text-neutral-600 select-none cursor-pointer"
                >
                  MUTE ALERTS (DO NOT DISTURB)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-neutral-250 hover:bg-neutral-150 text-neutral-600 font-mono text-xs uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={addPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 min-h-[40px] flex items-center justify-center space-x-2"
                >
                  {addPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SAVING POLICY...</span>
                    </>
                  ) : (
                    <span>CREATE RECORD</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Document Live Preview Modal */}
      {previewDocs && previewDocs.length > 0 && (
        <div className="fixed inset-0 bg-neutral-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-none w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl relative">
            <div className="bg-neutral-950 text-white p-4 flex justify-between items-center border-b border-neutral-800">
              <div>
                <h3 className="font-mono text-xs font-black tracking-widest uppercase">
                  DOCUMENT LIVE RESOURCE PREVIEW
                </h3>
                <p className="text-[9px] font-mono text-neutral-400 mt-0.5">
                  FILE {activePreviewIndex + 1} OF {previewDocs.length} // TYPE:{" "}
                  {previewDocs[activePreviewIndex].type}
                </p>
              </div>
              <button
                onClick={() => setPreviewDocs(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-100">
              {/* Tab Bar / Sidebar for Multiple Files */}
              {previewDocs.length > 1 && (
                <div className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-neutral-200 flex flex-row md:flex-col overflow-auto shrink-0 font-mono text-xs">
                  <div className="p-3 border-b border-neutral-200 hidden md:block text-neutral-400 font-bold uppercase text-[10px]">
                    SELECT DOCUMENT //
                  </div>
                  {previewDocs.map((doc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePreviewIndex(idx)}
                      className={`flex-1 md:flex-initial p-3 text-left border-r md:border-r-0 md:border-b border-neutral-100 hover:bg-neutral-50 transition-colors uppercase font-bold shrink-0 truncate ${
                        activePreviewIndex === idx
                          ? "bg-orange-50 text-orange-700 border-l-2 md:border-l-orange-500"
                          : "text-neutral-600"
                      }`}
                    >
                      {doc.label || `Document #${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Document Preview Pane */}
              <div className="flex-1 p-2 overflow-hidden flex items-center justify-center relative">
                {previewDocs[activePreviewIndex].type === "PDF" ? (
                  <iframe
                    src={previewDocs[activePreviewIndex].url}
                    className="w-full h-full border-none bg-white"
                    title="Document Preview"
                  />
                ) : previewDocs[activePreviewIndex].type === "Image" ? (
                  <img
                    src={previewDocs[activePreviewIndex].url}
                    className="max-w-full max-h-full object-contain shadow"
                    alt="Document Preview"
                  />
                ) : (
                  <div className="text-center font-mono text-xs text-neutral-500 uppercase">
                    Preview not supported for this file type.
                    <a
                      href={previewDocs[activePreviewIndex].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-orange-600 hover:underline mt-2"
                    >
                      Open in new tab
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Edit Policy Modal */}
      {isEditModalOpen && editPolicy && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-none w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-scale-in">
            <div className="bg-neutral-950 text-white p-5 flex justify-between items-center border-b border-neutral-800">
              <div>
                <h3 className="font-mono text-sm font-black tracking-widest uppercase">
                  EDIT POLICYHOLDER
                </h3>
                <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  SYSTEM UPDATE // CLOUDINARY FILE BUFFER STORAGE
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditPolicy(null);
                }}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleEditPolicySubmit}
              className="p-6 overflow-y-auto space-y-4"
            >
              <input type="hidden" name="id" value={editPolicy.id} />

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  HOLDER FULL NAME * //
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editPolicy.name}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    POLICY NUMBER * //
                  </label>
                  <input
                    type="text"
                    name="policyNumber"
                    required
                    defaultValue={editPolicy.policyNumber}
                    placeholder="POL-HLT-9988"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    POLICY TYPE * //
                  </label>
                  <select
                    name="policyType"
                    required
                    defaultValue={editPolicy.policyType}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  >
                    <option value="Car">Car</option>
                    <option value="Health">Health</option>
                    <option value="Life">Life</option>
                    <option value="Home">Home</option>
                    <option value="Travel">Travel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    ISSUE DATE * //
                  </label>
                  <input
                    type="date"
                    name="issueDate"
                    required
                    defaultValue={editPolicy.issueDate.substring(0, 10)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    EXPIRY DATE * //
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    required
                    defaultValue={editPolicy.expiryDate.substring(0, 10)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    MOBILE PHONE //
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    defaultValue={editPolicy.mobileNumber}
                    placeholder="+919876543210"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    EMAIL ADDRESS //
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editPolicy.email}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-xs font-mono rounded-none"
                  />
                </div>
              </div>

              {/* Existing Documents List */}
              {editPolicy.documents && editPolicy.documents.length > 0 && (
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    EXISTING DOCUMENTS IN VAULT //
                  </label>
                  <div className="space-y-1.5 border border-neutral-200 bg-neutral-50 p-2.5 max-h-24 overflow-y-auto">
                    {editPolicy.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] font-mono text-neutral-600 bg-white border border-neutral-150 p-1.5 px-2"
                      >
                        <span className="truncate font-bold uppercase">
                          {doc.label || `Document #${idx + 1}`} ({doc.type})
                        </span>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline hover:text-orange-700 font-bold"
                        >
                          VIEW
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
                  UPLOAD NEW DOCUMENTS TO VAULT //
                </label>
                <div className="space-y-2.5 border border-neutral-200 bg-neutral-50 p-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-600 mb-1">
                      AADHAAR CARD
                    </label>
                    <input
                      type="file"
                      name="doc_Aadhaar Card"
                      accept="application/pdf,image/*"
                      className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-600 mb-1">
                      PAN CARD
                    </label>
                    <input
                      type="file"
                      name="doc_PAN Card"
                      accept="application/pdf,image/*"
                      className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-600 mb-1">
                      VEHICLE RC
                    </label>
                    <input
                      type="file"
                      name="doc_Vehicle RC"
                      accept="application/pdf,image/*"
                      className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-neutral-600 mb-1">
                      CURRENT POLICY COPY
                    </label>
                    <input
                      type="file"
                      name="doc_Current Policy Copy"
                      accept="application/pdf,image/*"
                      className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                    />
                  </div>
                  <div className="pt-2 border-t border-neutral-200 mt-2">
                    <label className="block text-[10px] font-mono font-bold text-neutral-650 mb-1">
                      OTHER DOCUMENT
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        name="otherLabel"
                        placeholder="Enter Label (e.g. Driving License)"
                        className="flex-1 px-2 py-1.5 bg-white border border-neutral-200 focus:outline-none focus:border-orange-500 text-[11px] font-mono"
                      />
                      <input
                        type="file"
                        name="doc_Other"
                        accept="application/pdf,image/*"
                        className="text-xs font-mono file:py-1 file:px-2 file:border file:border-neutral-300 file:bg-white file:text-xs file:font-mono hover:file:bg-neutral-100"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 font-mono mt-1">
                  Upload directly to Cloudinary storage. Accepts PDF and image
                  formats.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  name="isMuted"
                  value="true"
                  defaultChecked={editPolicy.isMuted}
                  id="edit-mute"
                  className="w-4 h-4 accent-orange-600 cursor-pointer"
                />
                <label
                  htmlFor="edit-mute"
                  className="text-xs font-mono text-neutral-600 select-none cursor-pointer"
                >
                  MUTE ALERTS (DO NOT DISTURB)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditPolicy(null);
                  }}
                  className="px-4 py-2 border border-neutral-250 hover:bg-neutral-150 text-neutral-600 font-mono text-xs uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={editPending}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 min-h-[40px] flex items-center justify-center space-x-2"
                >
                  {editPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SAVING CHANGES...</span>
                    </>
                  ) : (
                    <span>SAVE CHANGES</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
