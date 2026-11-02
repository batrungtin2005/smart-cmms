import React from "react";

export default function Reports() {
  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h2>Báo cáo & Phân tích (Reports)</h2>
      <p>
        Thống kê thiết bị hỏng nhiều nhất và phân tích lịch sử bảo trì nhà máy.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
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
          <h3>Top thiết bị hỏng nhiều nhất</h3>
          <ul
            style={{ paddingLeft: "20px", color: "#374151", lineHeight: "1.8" }}
          >
            <li>Máy nén khí trục vít #1 (Hỏng 5 lần/tháng)</li>
            <li>Hệ thống điện lạnh trung tâm (Hỏng 3 lần/tháng)</li>
            <li>Cần cẩu trục 5 tấn (Hỏng 2 lần/tháng)</li>
          </ul>
        </div>
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3>Phân tích lịch sử bảo trì</h3>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            Biểu đồ trực quan hóa chi phí, thời gian dừng máy và hiệu quả sửa
            chữa theo từng quý trong năm.
          </p>
          <div
            style={{
              height: "100px",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              color: "#9ca3af",
            }}
          >
            [Khu vực hiển thị biểu đồ Recharts]
          </div>
        </div>
      </div>
    </div>
  );
}
