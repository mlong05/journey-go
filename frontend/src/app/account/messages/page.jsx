"use client";

import { Suspense } from "react";
import { MessagesScreen } from "@/features/tourist";

/** Tin nhắn với nhà tour — cuộc trò chuyện đang mở đọc từ ?c={id}. */
export default function AccountMessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesScreen />
    </Suspense>
  );
}
