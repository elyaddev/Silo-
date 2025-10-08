"use client";

type Props = {
  roomId: string;
  // keep this here in case you were passing initial data down,
  // but we don't need it for the room screen
  initial?: unknown;
};

/**
 * Room-level client wrapper.
 * Keep this lean; thread-level chat (messages/replies) belongs on the discussion page,
 * not the room page. This avoids passing the wrong props (e.g., discussionId).
 */
export default function ChatRoomClient(_props: Props) {
  // Nothing special needed here right now; the server page renders
  // DiscussionComposer and DiscussionList. If you later add client-only
  // interactions for the room shell, wire them up here.
  return null;
}
