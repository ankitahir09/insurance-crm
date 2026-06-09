'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

/**
 * Conditionally applies sidebar and header/footer spacing depending on the active route.
 * For example, the /login page is displayed fullscreen without margins.
 */
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-neutral-50">
      <Navbar />
      <main className="flex-1 min-h-screen p-4 md:p-8 pt-18 md:pt-8 pb-20 md:pb-8 md:ml-64 transition-all duration-200">
        {children}
      </main>
    </div>
  );
}
