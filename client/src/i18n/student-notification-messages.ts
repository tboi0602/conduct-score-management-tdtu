export const studentNotificationMessages = {
  vi: {
    title: "Thông báo",
    studentPortal: "Cổng thông tin sinh viên",
    description: "Theo dõi kết quả xử lý khiếu nại và các cập nhật dành cho bạn.",
    markAll: "Đánh dấu tất cả đã đọc",
    markRead: "Đánh dấu đã đọc",
    empty: "Bạn chưa có thông báo.",
    loadError: "Không thể tải thông báo.",
    approved: "Khiếu nại đã được chấp nhận",
    rejected: "Khiếu nại đã bị từ chối",
    event: "Sự kiện",
    viewAppeal: "Xem khiếu nại",
    conductScoreWarning: "Cảnh báo điểm rèn luyện",
    conductScoreWarningBody:
      "Điểm hiện tại của bạn thấp hơn ngưỡng {threshold}. Hãy kiểm tra điểm rèn luyện trước khi học kỳ kết thúc.",
    conductScoreMidpointWarningBody:
      "Học kỳ đã đi qua nửa chặng đường và điểm hiện tại của bạn thấp hơn ngưỡng {threshold}. Hãy kiểm tra các hoạt động còn thiếu.",
    conductScoreFinalWarningBody:
      "Học kỳ còn không quá 14 ngày và điểm hiện tại của bạn thấp hơn ngưỡng {threshold}. Hãy kiểm tra các hoạt động còn thiếu.",
    viewConductScore: "Xem điểm rèn luyện",
  },
  en: {
    title: "Notifications",
    studentPortal: "Student portal",
    description: "Track appeal decisions and updates addressed to you.",
    markAll: "Mark all as read",
    markRead: "Mark as read",
    empty: "You have no notifications.",
    loadError: "Unable to load notifications.",
    approved: "Appeal approved",
    rejected: "Appeal rejected",
    event: "Event",
    viewAppeal: "View appeal",
    conductScoreWarning: "Conduct score warning",
    conductScoreWarningBody:
      "Your current score is below the {threshold}-point threshold. Review your conduct score before the semester ends.",
    conductScoreMidpointWarningBody:
      "The semester has reached its midpoint and your current score is below the {threshold}-point threshold. Review your remaining activities.",
    conductScoreFinalWarningBody:
      "The semester ends within 14 days and your current score is below the {threshold}-point threshold. Review your remaining activities.",
    viewConductScore: "View conduct score",
  },
} as const;
