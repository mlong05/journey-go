"use client";

import { use } from "react";
import { CommunityPostScreen } from "@/features/tourist";

/** Chi tiết một bài viết cộng đồng. */
export default function CommunityPostPage({ params }) {
  const { id } = use(params);
  return <CommunityPostScreen postId={id} />;
}
