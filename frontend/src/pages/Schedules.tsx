import { useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";

interface ScheduleItem {
  id: string;
  title: string;
  assetName: string;
  cycleType: "Calendar" | "Runtime" | "Condition";
  frequency: string;
  nextDueDate: string;
  status: "UPCOMING" | "OVERDUE" | "COMPLETED";
}

export default function Schedules() {
  const [schedules] = useState<ScheduleItem[]>([
    {
      id: "PM-01",
      title: "Thay nhớt & lọc gió định kỳ",
      assetName: "Máy phát điện dự phòng 250kVA",
      cycleType: "Calendar",
      frequency: "3 tháng/lần",
      nextDueDate: "2026-11-04",
      status: "OVERDUE",
    },
    {
      id: "PM-02",
      title: "Hiệu chuẩn cảm biến áp suất",
      assetName: "Nồi hơi tầng sôi H-02",
      cycleType: "Runtime",
      frequency: "500 giờ chạy",
      nextDueDate: "2026-11-08",
      status: "UPCOMING",
    },
    {
      id: "PM-03",
      title: "Kiểm tra độ rung ổ trục",
      assetName: "Bơm nước mặn ly tâm",
      cycleType: "Condition",
      frequency: "Theo chỉ số IoT",
      nextDueDate: "2026-11-15",
      status: "UPCOMING",
    },
    {
      id: "PM-04",
      title: "Bảo dưỡng hệ thống làm mát",
      assetName: "Máy phay CNC 5 trục",
      cycleType: "Calendar",
      frequency: "6 tháng/lần",
      nextDueDate: "2026-11-01",
      status: "OVERDUE",
    },
  ]);

  return (
    <div style={{ paddingBottom: "30px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>
            Lịch Bảo Dưỡng Định Kỳ (PM Schedules)
          </h2>
          <p
            style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            Quản lý và lập kế hoạch bảo trì phòng ngừa tự động
          </p>
        </div>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: "#0284c7",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          <Plus size={18} /> Tạo lịch bảo dưỡng
        </button>
      </div>

      <div
        style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <AlertTriangle color="#dc2626" size={24} />
        <div>
          <h4 style={{ margin: 0, color: "#991b1b" }}>
            Cảnh báo: Có công việc bảo trì quá hạn!
          </h4>
          <p
            style={{ margin: "2px 0 0 0", color: "#b91c1c", fontSize: "13px" }}
          >
            Phát hiện lịch bảo dưỡng đã vượt quá ngày dự kiến. Vui lòng tạo Work
            Order để xử lý ngay.
          </p>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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
                fontSize: "14px",
              }}
            >
              <th style={{ padding: "12px 16px" }}>Mã PM</th>
              <th style={{ padding: "12px 16px" }}>Tên hạng mục bảo dưỡng</th>
              <th style={{ padding: "12px 16px" }}>Thiết bị</th>
              <th style={{ padding: "12px 16px" }}>Loại chu kỳ</th>
              <th style={{ padding: "12px 16px" }}>Tần suất</th>
              <th style={{ padding: "12px 16px" }}>Hạn bảo trì tiếp</th>
              <th style={{ padding: "12px 16px" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((item) => (
              <tr
                key={item.id}
                style={{ borderBottom: "1px solid #e2e8f0", fontSize: "14px" }}
              >
                <td
                  style={{
                    padding: "12px 16px",
                    fontWeight: "bold",
                    color: "#0284c7",
                  }}
                >
                  {item.id}
                </td>
                <td style={{ padding: "12px 16px", fontWeight: "500" }}>
                  {item.title}
                </td>
                <td style={{ padding: "12px 16px", color: "#475569" }}>
                  {item.assetName}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      background: "#f1f5f9",
                      color: "#334155",
                      fontWeight: "500",
                    }}
                  >
                    {item.cycleType}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#64748b" }}>
                  {item.frequency}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontWeight: "bold",
                    color: item.status === "OVERDUE" ? "#dc2626" : "#475569",
                  }}
                >
                  {item.nextDueDate}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      background:
                        item.status === "OVERDUE" ? "#fee2e2" : "#e0f2fe",
                      color: item.status === "OVERDUE" ? "#b91c1c" : "#0369a1",
                    }}
                  >
                    {item.status === "OVERDUE" ? "Quá hạn" : "Sắp đến hạn"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
