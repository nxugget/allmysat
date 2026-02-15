"use client";

import { motion } from "framer-motion";
import React from "react";

export default function PrivacyPolicy() {
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          {/* Back button */}
          <motion.a
            href="/"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </motion.a>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
              Privacy Policy - AllmySat
            </h1>
            <p className="text-gray-400 text-sm sm:text-base"><strong>Last updated:</strong> February 15, 2026</p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8 sm:space-y-10 text-gray-300 leading-relaxed prose prose-invert max-w-none"
          >
            {/* 1. Who We Are */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">1. Who We Are</h2>
              <p className="mb-3"><strong>AllmySat</strong> - Satellite Tracking Application</p>
              <p className="mb-3"><strong>France</strong></p>
              <p><strong>Contact:</strong> <span className="text-cyan-400">allmysat@icloud.com</span></p>
            </section>

            {/* 2. Our Approach */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">2. Our Approach</h2>
              <p className="mb-3"><strong>Simple:</strong> No personal data collected, no accounts required, no tracking.</p>
              <p>All your data stays <strong>on your iPhone</strong>. We only store public satellite data (orbits, frequencies, metadata).</p>
            </section>

            {/* 3. Data Processed Locally */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">3. Data Processed Locally</h2>
              <p className="mb-4">This data never leaves your device:</p>
              <ul className="space-y-2 ml-4">
                <li><strong>Location:</strong> Calculate visible passes (optional, can be entered manually)</li>
                <li><strong>Camera:</strong> AR mode only, no images saved</li>
                <li><strong>Favorites & Lists:</strong> Stored locally or via iCloud (encrypted by Apple)</li>
                <li><strong>Preferences:</strong> Display settings and notifications</li>
              </ul>
            </section>

            {/* 4. What We Store (Server) */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">4. What We Store (Server)</h2>
              <p className="mb-4">Supabase backend (France, GDPR-compliant):</p>
              <ul className="space-y-2 ml-4">
                <li>TLE orbital data (CelesTrak)</li>
                <li>Transmitter data (SatNOGS)</li>
                <li>Satellite metadata (images, launch dates)</li>
              </ul>
              <p className="mt-4"><strong>No user data.</strong></p>
            </section>

            {/* 5. In-App Purchases */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">5. In-App Purchases</h2>
              <p>Managed by the App Store. We only receive anonymous purchase confirmation. Apple handles payments and refunds.</p>
            </section>

            {/* 6. Your Rights (GDPR) */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">6. Your Rights (GDPR)</h2>
              <ul className="space-y-3 ml-4">
                <li><strong>Access/Modify:</strong> Directly in the app</li>
                <li><strong>Delete:</strong> Delete the app + disable iCloud in iOS Settings</li>
                <li><strong>Manage Permissions:</strong> iOS Settings → AllmySat</li>
              </ul>
              <p className="mt-4">Questions: <span className="text-cyan-400">allmysat@icloud.com</span> (response within 72h)</p>
              <p>File a complaint: <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">CNIL</a></p>
            </section>

            {/* 7. iOS Permissions */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">7. iOS Permissions</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-300 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-3 sm:px-4 text-cyan-300 font-semibold">Permission</th>
                      <th className="text-left py-3 px-3 sm:px-4 text-cyan-300 font-semibold">Purpose</th>
                      <th className="text-left py-3 px-3 sm:px-4 text-cyan-300 font-semibold">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-700/30">
                      <td className="py-2 px-3 sm:px-4">Location</td>
                      <td className="py-2 px-3 sm:px-4">Calculate passes</td>
                      <td className="py-2 px-3 sm:px-4">No*</td>
                    </tr>
                    <tr className="border-b border-slate-700/30">
                      <td className="py-2 px-3 sm:px-4">Camera</td>
                      <td className="py-2 px-3 sm:px-4">AR mode</td>
                      <td className="py-2 px-3 sm:px-4">No</td>
                    </tr>
                    <tr className="border-b border-slate-700/30">
                      <td className="py-2 px-3 sm:px-4">Notifications</td>
                      <td className="py-2 px-3 sm:px-4">Pass alerts</td>
                      <td className="py-2 px-3 sm:px-4">No</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 sm:px-4">Calendar</td>
                      <td className="py-2 px-3 sm:px-4">Add events</td>
                      <td className="py-2 px-3 sm:px-4">No</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-3">*Manual coordinate entry available</p>
            </section>

            {/* 8. Changes */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">8. Changes</h2>
              <p>You'll be notified in-app if this policy is updated.</p>
            </section>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
