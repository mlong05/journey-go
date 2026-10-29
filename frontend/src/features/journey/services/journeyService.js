/**
 * Service layer cho chuyến đi thực tế của du khách (API /journeys).
 *
 * Endpoint tích hợp:
 *  - POST  /api/v1/journeys                                  : bắt đầu / tiếp tục hành trình
 *  - GET   /api/v1/journeys/my                               : hành trình của tôi
 *  - GET   /api/v1/journeys/{id}                             : tiến độ chi tiết
 *  - POST  /api/v1/journeys/{id}/destinations/{d}/check-in   : check-in GPS hoặc QR
 *  - PATCH /api/v1/journeys/{id}/destinations/{d}/skip       : bỏ qua điểm đến
 *  - GET   /api/v1/journeys/{id}/tasks/{t}/questions         : nội dung nhiệm vụ (không có đáp án đúng)
 *  - GET   /api/v1/journeys/{id}/tasks/{t}/puzzle-clue       : manh mối
 *  - POST  /api/v1/journeys/{id}/tasks/{t}/submit            : nộp bài
 */
import { apiClient } from "@/services/apiClient";

function unwrap(res) {
  return res?.data ?? res;
}

const journeyService = {
  async start({ tourId, bookingId }) {
    return unwrap(
      await apiClient.post("/journeys", {
        tourId: Number(tourId),
        ...(bookingId ? { bookingId: Number(bookingId) } : {}),
      }),
    );
  },

  async getMine() {
    const data = unwrap(await apiClient.get("/journeys/my"));
    return Array.isArray(data) ? data : (data?.content ?? []);
  },

  async getById(journeyId) {
    return unwrap(await apiClient.get(`/journeys/${journeyId}`));
  },

  /** @param {{latitude:number, longitude:number}} position */
  async checkInGps(journeyId, destinationId, position) {
    return unwrap(
      await apiClient.post(`/journeys/${journeyId}/destinations/${destinationId}/check-in`, {
        verificationMethod: "GPS",
        latitude: position.latitude,
        longitude: position.longitude,
      }),
    );
  },

  async checkInQr(journeyId, destinationId, qrValue) {
    return unwrap(
      await apiClient.post(`/journeys/${journeyId}/destinations/${destinationId}/check-in`, {
        verificationMethod: "QR",
        qrValue,
      }),
    );
  },

  async skipDestination(journeyId, destinationId) {
    return unwrap(await apiClient.patch(`/journeys/${journeyId}/destinations/${destinationId}/skip`));
  },

  /** Backend ưu tiên qrValue nếu có, không thì dùng tọa độ để mở khóa nhiệm vụ cần vị trí. */
  async getTask(journeyId, taskId, { latitude, longitude, qrValue } = {}) {
    const params = new URLSearchParams();
    if (qrValue) {
      params.set("qrValue", qrValue);
    } else if (latitude != null && longitude != null) {
      params.set("latitude", String(latitude));
      params.set("longitude", String(longitude));
    }
    const query = params.toString();
    return unwrap(
      await apiClient.get(`/journeys/${journeyId}/tasks/${taskId}/questions${query ? `?${query}` : ""}`),
    );
  },

  async getClue(journeyId, taskId) {
    return unwrap(await apiClient.get(`/journeys/${journeyId}/tasks/${taskId}/puzzle-clue`));
  },

  /**
   * @param {Array<{questionId:number, answerId?:number, text?:string}>} answers
   * @param {{latitude?:number, longitude?:number, qrValue?:string}} [location]
   */
  async submitTask(journeyId, taskId, answers, location = {}) {
    return unwrap(
      await apiClient.post(`/journeys/${journeyId}/tasks/${taskId}/submit`, {
        answers,
        ...(location.latitude != null ? { latitude: location.latitude } : {}),
        ...(location.longitude != null ? { longitude: location.longitude } : {}),
        ...(location.qrValue ? { qrValue: location.qrValue } : {}),
      }),
    );
  },
};

export default journeyService;
