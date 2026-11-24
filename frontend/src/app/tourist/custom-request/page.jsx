// src/app/tourist/custom-request/page.jsx
"use client";

import React from "react";
import { Card, message } from "antd";
import CustomTourRequestForm from "@/features/tourist/components/CustomTourRequestForm";
import { tourRequestService } from "@/features/tourist/services/tourRequestService";
import { useRouter } from "next/navigation";

export default function CustomTourRequestPage() {
  const router = useRouter();

  const handleSubmit = async (values) => {
    try {
      await tourRequestService.createTourRequest(values);
      message.success("Yêu cầu tour đã được gửi. Bạn sẽ nhận thông báo khi nhà cung cấp chấp nhận.");
      router.push("/tourist/my-requests");
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Gửi yêu cầu thất bại");
    }
  };

  return (
    <Card title="Tạo Yêu Cầu Tour Tùy Chỉnh" style={{ maxWidth: 800, margin: "2rem auto" }}>
      <CustomTourRequestForm onFinish={handleSubmit} />
    </Card>
  );
}
