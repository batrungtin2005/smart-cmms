import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Plus,
  List,
} from "lucide-react";

interface Schedule {
  id: string;
  assetName: string;
  type: "CALENDAR" | "RUNTIME" | "CONDITION";
  rule: string;
  nextDueDate: string;
  dayOfMonth: number;
  status: "NORMAL" | "OVERDUE";
}

const initialSchedules: Schedule[] = [
  {
    id: "PM-001",
    assetName: "Máy nén khí Piston 15HP",
    type: "CALENDAR",
    rule: "Định kỳ hằng tháng (Ngày 15)",
    nextDueDate: "2026-11-15",
    dayOfMonth: 15,
    status: "NORMAL",
  },
  {
    id: "PM-002",
    assetName: "Máy phay CNC Haas VF-2",
    type: "RUNTIME",
    rule: "Bảo dưỡng mỗi 500 giờ chạy máy",
    nextDueDate: "Đã đạt 495/500 giờ (Dự kiến 20/11)",
    dayOfMonth: 20,
    status: "NORMAL",
  },
  {
    id: "PM-003",
    assetName: "Lò nhiệt luyện L-01",
    type: "CONDITION",
    rule: "Cảnh báo khi nhiệt độ > 85°C hoặc độ rung cao",
    nextDueDate: "Nhiệt độ hiện tại: 88°C (Vượt ngưỡng)",
    dayOfMonth: 17,
    status: "OVERDUE",
  },
  {
    id: "PM-004",
    assetName: "Băng tải chuyền đóng gói",
    type: "CALENDAR",
    rule: "Định kỳ hằng tuần (Thứ Hai)",
    nextDueDate: "2026-11-02 (Quá hạn)",
    dayOfMonth: 2,
    status: "OVERDUE",
  },
];

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Modal tạo lịch mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [type, setType] = useState<Schedule["type"]>("CALENDAR");
  const [rule, setRule] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState(25);

  const filtered = schedules.filter(
    (s) => filterType === "ALL" || s.type === filterType,
  );

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: Schedule = {
      id: `PM-00${schedules.length + 1}`,
      assetName,
      type,
      rule,
      nextDueDate: `2026-11-${dayOfMonth.toString().padStart(2, "0")}`,
      dayOfMonth,
      status: "NORMAL",
    };
    setSchedules([newItem, ...schedules]);
    setShowCreateModal(false);
    setAssetName("");
    setRule("");
  };

  return (
    <div>
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
            Lịch bảo dưỡng định kỳ (PM Schedules)
          </h2>
          <p
            style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            3 chế độ kích hoạt bảo dưỡng, giao diện lịch tháng và cảnh báo quá
            hạn
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background: "#0284c7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            <Plus size={16} /> Tạo lịch bảo dưỡng
          </button>

          <div
            style={{
              display: "flex",
              gap: "6px",
              background: "#e2e8f0",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "6px 12px",
                border: "none",
                borderRadius: "4px",
                background: viewMode === "list" ? "#fff" : "transparent",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <List size={15} /> Danh sách
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              style={{
                padding: "6px 12px",
                border: "none",
                borderRadius: "4px",
                background: viewMode === "calendar" ? "#fff" : "transparent",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <CalendarIcon size={15} /> Calendar View
            </button>
          </div>
        </div>
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
          onClick={() =>
            setFilterType(filterType === "CALENDAR" ? "ALL" : "CALENDAR")
          }
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
          onClick={() =>
            setFilterType(filterType === "RUNTIME" ? "ALL" : "RUNTIME")
          }
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
          onClick={() =>
            setFilterType(filterType === "CONDITION" ? "ALL" : "CONDITION")
          }
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

      {viewMode === "list" ? (
        /* Bảng danh sách */
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
      ) : (
        /* Giao diện Calendar View Tháng 11/2026 */
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", color: "#0f172a" }}>
            Lịch Bảo Dưỡng Tháng 11 / 2026
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "8px",
            }}
          >
            {Array.from({ length: 30 }, (_, idx) => {
              const day = idx + 1;
              const dayEvents = filtered.filter((s) => s.dayOfMonth === day);
              return (
                <div
                  key={day}
                  style={{
                    minHeight: "85px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "8px",
                    background: day === 17 ? "#f0f9ff" : "#fff",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: day === 17 ? "#0284c7" : "#64748b",
                      marginBottom: "6px",
                    }}
                  >
                    Ngày {day}
                  </div>
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        fontSize: "11px",
                        padding: "4px 6px",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        fontWeight: "bold",
                        background:
                          ev.status === "OVERDUE" ? "#fee2e2" : "#dcfce7",
                        color: ev.status === "OVERDUE" ? "#b91c1c" : "#15803d",
                      }}
                    >
                      {ev.id}: {ev.assetName}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Tạo Lịch Bảo Dưỡng Mới */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={handleCreateSchedule}
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "10px",
              width: "400px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Tạo Lịch Bảo Dưỡng Định Kỳ (PM)</h3>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                Tên thiết bị áp dụng
              </label>
              <input
                type="text"
                required
                placeholder="VD: Máy cắt Laser Fiber #03"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                Kiểu kích hoạt (3 chế độ)
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Schedule["type"])}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                }}
              >
                <option value="CALENDAR">1. Theo thời gian (CALENDAR)</option>
                <option value="RUNTIME">2. Theo giờ chạy máy (RUNTIME)</option>
                <option value="CONDITION">
                  3. Theo ngưỡng cảm biến (CONDITION)
                </option>
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                Quy tắc kích hoạt chi tiết
              </label>
              <input
                type="text"
                required
                placeholder="VD: Bảo trì sau mỗi 300 giờ chạy"
                value={rule}
                onChange={(e) => setRule(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                Ngày dự kiến trong tháng (1 - 30)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#0284c7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Lưu lịch PM
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#e2e8f0",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
