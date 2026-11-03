import { Suspense } from "react";
import AdminUsersClient from "./UsersClient";

// Client component đọc ?search= từ ô tìm kiếm đầu trang; useSearchParams cần nằm trong Suspense.
export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersClient />
    </Suspense>
  );
}
