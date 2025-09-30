"use client";
import AuthGuard from "@/components/AuthGuard";

export default function ProSupportPage() {
  return (
    <AuthGuard>
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold mb-4">Pro Support</h1>
        <p className="text-gray-600 mb-8">
          Private access to licensed professionals (coming soon).
        </p>

        {/* Placeholder CTA */}
        <div className="rounded-2xl border p-6">
          <p className="mb-4">Join the waitlist and we’ll notify you.</p>
          <a
            href="mailto:hello@athletechat.app?subject=Pro%20Support%20Waitlist"
            className="inline-block rounded-xl border px-4 py-2 hover:bg-gray-50"
          >
            Join waitlist
          </a>
        </div>
      </main>
    </AuthGuard>
  );
}
