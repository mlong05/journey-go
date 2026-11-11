/**
 * Feature "Booking" cho WEB.
 *
 * ── Phạm vi ──
 * Web chỉ phục vụ ADMIN / ĐỐI TÁC (provider) / MODERATOR.
 * Luồng DU KHÁCH (đặt tour, thanh toán, hành trình) nằm hoàn toàn trên MOBILE
 * ⇒ các hook/component dành cho du khách đã được gỡ khỏi web.
 *
 *  • `bookingService`      — đọc dữ liệu đơn đặt cho admin/provider.
 *  • `passengerService`   — duyệt yêu cầu thay đổi hành khách, chat (provider).
 *  • `Pager`              — phân trang dùng chung.
 *  • `PassengerListPanel` — danh sách hành khách của một booking.
 *  • `BookingChatPanel`   — khung chat hỗ trợ gắn với booking.
 */
export { default as bookingService, toPage } from "./services/bookingService";
export { default as Pager } from "./components/Pager";
export { default as PassengerListPanel } from "./components/PassengerListPanel";
export { default as BookingChatPanel } from "./components/BookingChatPanel";
