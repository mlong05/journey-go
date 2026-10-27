"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModeratorExperiencesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/moderator/destinations");
  }, [router]);
  return null;
}