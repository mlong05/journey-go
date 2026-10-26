"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminExperiencesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/destinations");
  }, [router]);
  return null;
}
