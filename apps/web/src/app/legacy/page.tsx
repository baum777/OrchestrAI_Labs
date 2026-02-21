"use client";

import { InteractiveTrustDemo } from "../../components/marketing/InteractiveTrustDemo.js";
import { GovernanceShieldSection } from "../../components/marketing/GovernanceShieldSection.js";
import { AuditLedgerViewSection } from "../../components/marketing/AuditLedgerViewSection.js";
import { MultiTenantSafetySection } from "../../components/marketing/MultiTenantSafetySection.js";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-navy-900 bg-clip-text text-transparent">
                OrchestrAI Labs
              </h1>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/fleet"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              OrchestrAI Labs: The Agency OS for Secure & Deterministic AI
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              Verwandeln Sie riskante KI-Experimente in revisionssichere Enterprise-Services. 
              Schützen Sie Ihre Haftung, skalieren Sie Ihre Ergebnisse.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/fleet"
                className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Start Your Governance Audit
              </Link>
            </div>
          </div>

          {/* Interactive Trust Demo */}
          <InteractiveTrustDemo />
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Drei Säulen der technischen Überlegenheit
            </h2>
            <p className="text-xl text-gray-600">
              Mathematisch beweisbare Sicherheit für Ihre Agent-Systeme
            </p>
          </div>

          <div className="space-y-24">
            <GovernanceShieldSection />
            <AuditLedgerViewSection />
            <MultiTenantSafetySection />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Bereit für revisionssichere KI?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Starten Sie Ihre Governance-Audit und erleben Sie mathematisch beweisbare Determinismus.
          </p>
          <Link
            href="/fleet"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Start Your Governance Audit
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              © 2026 OrchestrAI Labs. Built with deterministic governance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

