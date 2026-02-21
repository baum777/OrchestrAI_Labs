"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Fleet Monitor", href: "/fleet", icon: "🚀" },
  { label: "Approval Inbox", href: "/approval", icon: "📬" },
  { label: "Governance", href: "/governance", icon: "🛡️" },
  { label: "Audit Ledger", href: "/audit", icon: "📋" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gradient-to-b from-indigo-900 to-navy-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-indigo-800">
        <h1 className="text-xl font-bold">Agent System</h1>
        <p className="text-sm text-indigo-300 mt-1">Governance Console</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? "bg-indigo-700 text-white shadow-lg" 
                      : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-indigo-800">
        <div className="text-xs text-indigo-400">
          <div>Version 1.0.0</div>
          <div className="mt-1">Deterministic Clock</div>
        </div>
      </div>
    </aside>
  );
}


