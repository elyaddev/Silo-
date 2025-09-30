import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">Silo</h1>
        <p className="text-sm">Athlete chat coming soon. For now, sign in.</p>
        <Link href="/login" className="underline">
          Go to Login
        </Link>
      </div>
    </main>
  );
}
