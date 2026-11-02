import React, { useState } from "react";

export default function WorkOrders() {
  const [orders] = useState([
    { id: "WO-101", title: "Sửa lỗi áp suất máy nén", status: "OPEN" },
    { id: "WO-102", title: "Thay dầu hệ thống lạnh", status: "ASSIGNED" },
    { id: "WO-103", title: "Kiểm tra mạch điện chính", status: "IN_PROGRESS" },
    { id: "WO-104", title: "Bảo dưỡng định kỳ quạt gió", status: "COMPLETED" },
    { id: "WO-105", title: "Đổi mới bộ lọc thô", status: "CLOSED" },
  ]);

  const statuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED"];

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h2>Quản lý Phiếu Công Việc (Work Orders Kanban)</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
          marginTop: "20px",
        }}
      >
        {statuses.map((stt) => (
          <div
            key={stt}
            style={{
              background: "#f3f4f6",
              padding: "12px",
              borderRadius: "8px",
              minHeight: "300px",
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                textAlign: "center",
                color: "#374151",
              }}
            >
              {stt}
            </h4>
            {orders
              .filter((o) => o.status === stt)
              .map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#fff",
                    padding: "10px",
                    borderRadius: "6px",
                    marginBottom: "10px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <strong style={{ fontSize: "14px" }}>{item.id}</strong>
                  <p style={{ fontSize: "13px", margin: "6px 0 0 0" }}>
                    {item.title}
                  </p>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
