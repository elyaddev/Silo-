"use client";
import AuthGuard from "@/components/AuthGuard";
import RoomsList from "@/components/RoomsList";

export default function RoomsPage() {
  return (
    <AuthGuard>
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold mb-4">Rooms</h1>
        <p className="text-gray-600 mb-8">Members-only chat rooms.</p>
        <RoomsList />
      </main>
    </AuthGuard>
  );
}
