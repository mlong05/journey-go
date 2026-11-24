// src/features/tourist/components/CustomTourRequestForm.jsx
"use client";

import React from "react";
import { Form, Input, Select, DatePicker, InputNumber, Button, Radio } from "antd";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;

export default function CustomTourRequestForm({ onFinish }) {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    // Convert dates to string yyyy-MM-dd
    const formatted = {
      ...values,
      startDate: values.dateRange?.[0]?.format("YYYY-MM-DD"),
      endDate: values.dateRange?.[1]?.format("YYYY-MM-DD"),
    };
    delete formatted.dateRange;
    onFinish(formatted);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      style={{ maxWidth: 600 }}
    >
      <Form.Item
        name="title"
        label="Tiêu đề yêu cầu"
        rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
      >
        <Input placeholder="Ví dụ: Tour du lịch khám phá miền Trung" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Mô tả chi tiết"
        rules={[{ required: true, message: "Vui lòng mô tả yêu cầu" }]}
      >
        <TextArea rows={4} placeholder="Nội dung chi tiết, điểm đến, hoạt động mong muốn..." />
      </Form.Item>

      <Form.Item
        name="visibility"
        label="Độ hiển thị"
        initialValue="ALL"
        rules={[{ required: true }]}
      >
        <Radio.Group>
          <Radio value="ALL">Công khai (cho tất cả)</Radio>
          <Radio value="SPECIFIC">Chỉ người dùng cụ thể</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prev, cur) => prev.visibility !== cur.visibility}
      >
        {({ getFieldValue }) =>
          getFieldValue("visibility") === "SPECIFIC" ? (
            <Form.Item
              name="specificUserEmail"
              label="Email người dùng nhận tour"
              rules={[{ required: true, type: "email", message: "Nhập email hợp lệ" }]}
            >
              <Input placeholder="user@example.com" />
            </Form.Item>
          ) : null
        }
      </Form.Item>

      <Form.Item
        name="dateRange"
        label="Khoảng thời gian dự kiến"
        rules={[{ type: "array", required: true, message: "Chọn ngày bắt đầu và kết thúc" }]}
      >
        <DatePicker.RangePicker disabledDate={(current) => current && current < dayjs().startOf("day")} />
      </Form.Item>

      <Form.Item
        name="guestCount"
        label="Số khách"
        rules={[{ required: true, type: "number", min: 1, message: "Số khách ít nhất 1" }]}
      >
        <InputNumber min={1} />
      </Form.Item>

      <Form.Item
        name="budget"
        label="Ngân sách (VND)"
        rules={[{ required: true, type: "number", min: 0, message: "Vui lòng nhập ngân sách" }]}
      >
        <InputNumber min={0} step={1000000} style={{ width: "100%" }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={value => value.replace(/\,*/g, "")} />
      </Form.Item>

      <Form.Item name="specialRequirements" label="Yêu cầu đặc biệt (tuỳ chọn)">
        <TextArea rows={2} placeholder="Ví dụ: ăn chay, đi xe đạp, v.v." />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Gửi yêu cầu
        </Button>
      </Form.Item>
    </Form>
  );
}
