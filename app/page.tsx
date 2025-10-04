"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#FFF8F2] text-gray-900 px-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-2xl mt-20"
      >
        <h1 className="text-5xl sm:text-6xl font-extrabold text-orange-500 mb-6 font-fredoka">
          Welcome to <span className="text-gray-900">Silo</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 mb-10">
          A place for athletes to connect, talk, and grow together — all in one safe space.
        </p>

        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-full font-semibold text-lg hover:bg-orange-600 transition"
        >
          Explore Rooms <ArrowRight size={20} />
        </Link>
      </motion.div>

      {/* Feature Grid Section */}
      <section className="mt-28 grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-5xl w-full">
        {/* Box 1 */}
        <div className="rounded-3xl bg-[#FFF2E8] p-8 shadow-sm border border-orange-100">
          <p className="text-sm font-semibold text-orange-500 mb-2">Anon handles</p>
          <h3 className="text-xl font-bold mb-2 text-gray-900">
            Be heard without being seen
          </h3>
          <p className="text-gray-600">
            Pick a handle. Share openly. Your legal name is never shown.
          </p>
        </div>

        {/* Box 2 */}
        <div className="rounded-3xl bg-[#F6FFF3] p-8 shadow-sm border border-green-100">
          <p className="text-sm font-semibold text-green-500 mb-2">Realtime</p>
          <h3 className="text-xl font-bold mb-2 text-gray-900">
            Fast, live threads
          </h3>
          <p className="text-gray-600">
            Post a question, get replies instantly with Supabase Realtime.
          </p>
        </div>

        {/* Box 3 */}
        <div className="rounded-3xl bg-[#FFF2E8] p-8 shadow-sm border border-orange-100">
          <p className="text-sm font-semibold text-orange-500 mb-2">Safety-first</p>
          <h3 className="text-xl font-bold mb-2 text-gray-900">
            Clear guardrails
          </h3>
          <p className="text-gray-600">
            Community rules & moderation tools keep rooms supportive.
          </p>
        </div>

        {/* Box 4 */}
        <div className="rounded-3xl bg-[#F6FFF3] p-8 shadow-sm border border-green-100">
          <p className="text-sm font-semibold text-green-500 mb-2">For teams</p>
          <h3 className="text-xl font-bold mb-2 text-gray-900">
            Room topics for every sport
          </h3>
          <p className="text-gray-600">
            Training, injuries, performance, and more.
          </p>
        </div>
      </section>
    </main>
  );
}
