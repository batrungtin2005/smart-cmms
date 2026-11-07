import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface Schedule {
  id: string;
  assetName: string;
  type: "CALENDAR" | "RUNTIME" | "CONDITION";
  rule: string;
  nextDueDate: string;
  status: "NORMAL" | "OVERDUE";
}

const mockSchedules: Schedule[] = [
  {
    id: "PM-001",
    assetName: "Máy nén khí Piston 15HP",
    type: "CALENDAR",
    rule: "Định kỳ hằng tháng (Ngày 15)",
    nextDueDate: "2026-11-15",
    status: "NORMAL",
  },
  {
    id: "PM-002",
    assetName: "Máy phay CNC Haas VF-2",
    type: "RUNTIME",
    rule: "Bảo dưỡng mỗi 500 giờ chạy máy",
    nextDueDate: "Đã đạt 495/500 giờ",
    status: "NORMAL",
  },
  {
    id: "PM-003",
    assetName: "Lò nhiệt luyện L-01",
    type: "CONDITION",
    rule: "Cảnh báo khi nhiệt độ > 85°C hoặc độ rung cao",
    nextDueDate: "Nhiệt độ hiện tại: 88°C (Vượt ngưỡng)",
    status: "OVERDUE",
  },
  {
    id: "PM-004",
    assetName: "Băng tải chuyền đóng gói",
    type: "CALENDAR",
    rule: "Định kỳ hằng tuần (Thứ Hai)",
    nextDueDate: "2026-11-02 (Quá hạn 6 ngày)",
    status: "OVERDUE",
  },
];

export default function Schedules() {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filtered = mockSchedules.filter(
    (s) => filterType === "ALL" || s.type === filterType,
  );

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, color: "#0f172a" }}>
          Lịch bảo dưỡng định kỳ (PM Schedules)
        </h2>
        <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
          Demo 3 chế độ kích hoạt lịch bảo dưỡng và cảnh báo quá hạn màu đỏ
        </p>
      </div>

      {/* Card 3 kiểu lịch */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          onClick={() => setFilterType("CALENDAR")}
          style={{
            background: "#fff",
            padding: "16px",
            borderRadius: "8px",
            border:
              filterType === "CALENDAR"
                ? "2px solid #0284c7"
                : "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#0284c7",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            <CalendarIcon size={20} /> 1. Theo thời gian (Calendar)
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Tự động tạo phiếu theo chu kỳ ngày, tuần, tháng
          </p>
        </div>

        <div
          onClick={() => setFilterType("RUNTIME")}
          style={{
            background: "#fff",
            padding: "16px",
            borderRadius: "8px",
            border:
              filterType === "RUNTIME"
                ? "2px solid #d97706"
                : "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#d97706",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            <Clock size={20} /> 2. Theo giờ chạy (Runtime)
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Tự động kích hoạt khi máy chạy đủ số giờ quy định
          </p>
        </div>

        <div
          onClick={() => setFilterType("CONDITION")}
          style={{
            background: "#fff",
            padding: "16px",
            borderRadius: "8px",
            border:
              filterType === "CONDITION"
                ? "2px solid #dc2626"
                : "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#dc2626",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            <AlertTriangle size={20} /> 3. Theo ngưỡng (Condition)
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            Báo động khi cảm biến nhiệt độ/độ rung vượt mức
          </p>
        </div>
      </div>

      {/* Bảng danh sách */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: "13px",
              }}
            >
              <th style={{ padding: "12px" }}>Mã lịch</th>
              <th style={{ padding: "12px" }}>Thiết bị áp dụng</th>
              <th style={{ padding: "12px" }}>Phân loại kiểu lịch</th>
              <th style={{ padding: "12px" }}>Quy tắc kích hoạt</th>
              <th style={{ padding: "12px" }}>
                Thời gian / Cảnh báo tiếp theo
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  background: item.status === "OVERDUE" ? "#fef2f2" : "#fff",
                }}
              >
                <td style={{ padding: "12px", fontWeight: "bold" }}>
                  {item.id}
                </td>
                <td style={{ padding: "12px", fontWeight: "500" }}>
                  {item.assetName}
                </td>
                <td style={{ padding: "12px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      background: "#f1f5f9",
                      color: "#334155",
                    }}
                  >
                    {item.type}
                  </span>
                </td>
                <td style={{ padding: "12px", color: "#475569" }}>
                  {item.rule}
                </td>
                <td
                  style={{
                    padding: "12px",
                    fontWeight: "bold",
                    color: item.status === "OVERDUE" ? "#dc2626" : "#16a34a",
                  }}
                >
                  {item.status === "OVERDUE" && "⚠️ "} {item.nextDueDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
