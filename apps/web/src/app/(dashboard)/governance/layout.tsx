"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
}

const subNavItems: NavItem[] = [
  { label: "Übersicht", href: "/governance" },
  { label: "Validatoren", href: "/governance/validators" },
  { label: "CI Health", href: "/governance/ci-health" },
];

export default function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header with Sub-Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Governance Dashboard</h1>
          <p className="text-gray-600 mt-1">Übersicht und Status der Governance-Validierung</p>
        </div>

        {/* Sub-Navigation */}
        <nav className="border-t border-gray-200 pt-4">
          <ul className="flex flex-wrap gap-2">
            {subNavItems.map((item) => {
              // Exact match for /governance, startsWith for sub-pages
              const isActive =
                item.href === "/governance"
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
