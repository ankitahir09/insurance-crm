"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error || "Invalid credentials");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4 relative">
      {/* Industrial Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-size-[3rem_3rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-none shadow-xl p-8 relative z-10">
        {/* Decorative Industrial Border Lines in Safety Orange */}
        <div className="absolute top-0 left-0 w-6 h-[2px] bg-orange-600" />
        <div className="absolute top-0 left-0 w-[2px] h-6 bg-orange-600" />
        <div className="absolute bottom-0 right-0 w-6 h-[2px] bg-orange-600" />
        <div className="absolute bottom-0 right-0 w-[2px] h-6 bg-orange-600" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-neutral-900 text-orange-500 flex items-center justify-center rounded-none mb-3">
            <ShieldCheck className="w-6 h-6 text-orange-600" />
          </div>
          <h1 className="font-mono text-2xl font-black text-neutral-950 uppercase tracking-widest">
            SECURE CRM
          </h1>
          <p className="text-neutral-500 text-xs font-mono uppercase tracking-wider mt-1">
            Insurance Agent Portal
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border-l-2 border-red-500 text-red-800 text-sm font-mono flex items-start">
            <span className="font-bold mr-1.5">FAIL //</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-600 mb-2">
              ADMIN EMAIL //
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@agency.com"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 font-mono transition-all text-sm rounded-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-600 mb-2">
              PASSWORD //
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 font-mono transition-all text-sm rounded-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-mono font-bold uppercase tracking-wider text-sm flex items-center justify-center space-x-2 transition-all duration-200 shadow-md group disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AUTHENTICATING...</span>
              </>
            ) : (
              <>
                <span>ACCESS PORTAL</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-100 flex justify-between items-center text-[10px] font-mono text-neutral-400">
          <span>SECURE PROTOCOL V1</span>
          <span>INTERNAL USE ONLY</span>
        </div>
      </div>
    </div>
  );
}
