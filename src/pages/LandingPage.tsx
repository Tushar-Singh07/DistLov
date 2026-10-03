import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquare, PhoneCall, Image as ImageIcon, Lock, Zap, Users, ArrowRight } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/common/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-800 animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-brand-500" /> Private Conversations. Real-time Communication.
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            Connect Securely with <span className="bg-gradient-to-r from-brand-500 to-indigo-500 bg-clip-text text-transparent">Zero Friction</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            SecureConnect brings real-time 1-on-1 messaging, group chats, rich media sharing, and crystal-clear voice and video calling together in one unified web platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto" icon={<ArrowRight className="w-5 h-5" />}>
                Start Messaging Now
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign In to Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-16 bg-white dark:bg-dark-panel/40 border-y border-gray-200/80 dark:border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Built for Effortless Communication</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Everything you need for personal or team collaboration.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl glass-card space-y-4">
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Real-Time Messaging</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Instant delivery with read receipts, typing indicators, threaded replies, and interactive emoji reactions.
              </p>
            </div>

            <div className="p-6 rounded-2xl glass-card space-y-4" id="calling">
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                <PhoneCall className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Voice & Video Calls</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                HD 1-on-1 audio and video calling directly in your browser with built-in screen sharing capabilities.
              </p>
            </div>

            <div className="p-6 rounded-2xl glass-card space-y-4">
              <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rich Media Sharing</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Share photos, videos, voice memos, and documents with built-in inline players and previews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-16 px-4">
        <div className="max-w-5xl mx-auto glass-panel rounded-3xl p-8 md:p-12 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-3xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xl">
            <Lock className="w-8 h-8 md:w-12 md:h-12" />
          </div>
          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Architected for Privacy & Safety</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              SecureConnect prioritizes session protection, encrypted password hashing, email verification, active device tracking, and granular privacy controls.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 py-8 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>© 2026 SecureConnect Inc. All rights reserved. Designed for privacy and real-time collaboration.</p>
      </footer>
    </div>
  );
};
