import React from "react";

export default function Schedules() {
  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h2>Lịch Bảo Dưỡng Dự Phòng (Schedules)</h2>
      <p>
        Xem lịch trình theo tháng/tuần và cấu hình 3 kiểu lịch bảo dưỡng tự
        động.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3>1. Theo Thời gian (Time-based)</h3>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Cấu hình lịch chạy định kỳ theo tuần hoặc theo tháng (VD: Chủ nhật
            hàng tuần).
          </p>
          <button
            style={{
              padding: "6px 12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cấu hình
          </button>
        </div>
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3>2. Theo Số giờ chạy (Meter-based)</h3>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Kích hoạt lịch bảo dưỡng khi máy đạt số giờ hoạt động nhất định (VD:
            500 giờ).
          </p>
          <button
            style={{
              padding: "6px 12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cấu hình
          </button>
        </div>
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3>3. Theo Ngưỡng cảnh báo</h3>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Tạo lệnh tự động khi thông số cảm biến vượt ngưỡng an toàn (nhiệt
            độ, áp suất).
          </p>
          <button
            style={{
              padding: "6px 12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cấu hình
          </button>
        </div>
      </div>
    </div>
  );
}
