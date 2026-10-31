import React from "react";

export default function Dashboard() {
  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h2>Dashboard KPI & Tổng quan hệ thống Smart CMMS</h2>
      <p>
        Giám sát chỉ số vận hành, bảo trì thiết bị và quản lý tác vụ nhà máy.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
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
          <h4 style={{ margin: "0 0 10px 0", color: "#6b7280" }}>
            Tổng số thiết bị
          </h4>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#2563eb",
              margin: 0,
            }}
          >
            300 máy
          </p>
          <span style={{ fontSize: "12px", color: "#16a34a" }}>
            ✓ Đã đồng bộ CSDL
          </span>
        </div>
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#6b7280" }}>
            Chỉ số MTTR
          </h4>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#16a34a",
              margin: 0,
            }}
          >
            2.4h
          </p>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            Thời gian sửa chữa trung bình
          </span>
        </div>
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#6b7280" }}>
            Chỉ số MTBF
          </h4>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#d97706",
              margin: 0,
            }}
          >
            350h
          </p>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            Thời gian giữa các lần hỏng
          </span>
        </div>
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h4 style={{ margin: "0 0 10px 0", color: "#6b7280" }}>
            Cảnh báo quá hạn
          </h4>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#dc2626",
              margin: 0,
            }}
          >
            3 phiếu
          </p>
          <span style={{ fontSize: "12px", color: "#dc2626" }}>
            ⚠️ Cần xử lý gấp
          </span>
        </div>
      </div>
    </div>
  );
}
