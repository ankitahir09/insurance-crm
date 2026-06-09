"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null; // Hide navigation for unauthenticated pages

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Broadcast", href: "/broadcast", icon: Users },
    { name: "Profile Settings", href: "/profile", icon: SettingsIcon },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-950 text-white h-screen fixed left-0 top-0 border-r border-neutral-800 z-30">
        <div className="p-6 border-b border-neutral-800 flex items-center space-x-3">
          <div className="bg-orange-600 p-2 text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-black tracking-widest text-neutral-100 uppercase">
              SECURE CRM
            </h1>
            <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
              Internal Portal
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 font-mono text-xs tracking-wider uppercase transition-all duration-150 rounded-none ${
                  isActive
                    ? "bg-orange-600 text-white font-bold"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800 font-mono text-xs text-neutral-400 flex flex-col space-y-3">
          <div>
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider">
              LOGGED IN AS:
            </p>
            <p className="font-bold truncate text-neutral-200 mt-0.5">
              {session.user?.name || session.user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full py-2.5 bg-neutral-900 hover:bg-red-950 hover:text-red-200 text-neutral-300 flex items-center justify-center space-x-2 border border-neutral-800 hover:border-red-900 transition-colors uppercase tracking-wider text-[10px] font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOGOUT SYSTEM</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-neutral-950 text-white h-14 fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 border-b border-neutral-850">
        <div className="flex items-center space-x-2">
          <div className="bg-orange-600 p-1.5 text-white flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-mono text-xs font-black tracking-widest uppercase">
            SECURE CRM
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-neutral-400 hover:text-white p-2 flex items-center justify-center"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Mobile Bottom Bar (iOS/Android Native Touch Feel) */}
      <nav className="md:hidden bg-white border-t border-neutral-250 fixed bottom-0 left-0 right-0 h-16 z-40 flex justify-around items-center pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full font-mono text-[9px] tracking-widest uppercase transition-colors min-h-[44px] ${
                isActive
                  ? "text-orange-600 font-bold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
