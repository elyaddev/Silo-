"use client";

import ChatMessages from "@/components/ChatMessages";
import ChatInputQA from "@/components/ChatInputQA";
import { useRealtimeMessages } from "@/lib/useRealtimeMessages";

type Message = {
  id: string;
  room_id: string;
  profile_id: string | null;
  content: string;
  created_at: string;
};

export default function ChatRoomClient({
  roomId,
  initial,
}: {
  roomId: string;
  initial: Message[];
}) {
  const { messages, setMessages } = useRealtimeMessages(roomId, initial);

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col bg-gray-50">
      {/* Optional: room name header */}
      {/* <header className="px-4 py-3 text-xl font-semibold">{roomName}</header> */}
      <ChatMessages messages={messages} />
      <ChatInputQA
        roomId={roomId}
        onOptimisticAdd={(m) => setMessages((prev) => [...prev, m])}
        onConfirm={(tempId, real) =>
          setMessages((prev) => prev.map((p) => (p.id === tempId ? real : p)))
        }
      />
    </div>
  );
}
