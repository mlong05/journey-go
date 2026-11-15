"use client";

import { use } from "react";
import { InvitationAcceptScreen } from "@/features/tourist";

/** Xác nhận lời mời tham gia tour (deep link trong email). */
export default function InvitationAcceptPage({ params }) {
  const { token } = use(params);
  return <InvitationAcceptScreen token={token} />;
}
