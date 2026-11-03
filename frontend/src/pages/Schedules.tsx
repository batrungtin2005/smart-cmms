import { Calendar as CalendarIcon, Clock } from "lucide-react";

export default function Schedules() {
  const schedules = [
    {
      id: "SCH-01",
      name: "Bảo dưỡng định kỳ máy nén khí",
      cycle: "Hàng tháng",
      nextDate: "2026-11-15",
      status: "Sắp tới",
    },
    {
      id: "SCH-02",
      name: "Tra mỡ băng tải Xưởng B",
      cycle: "Hàng tuần",
      nextDate: "2026-11-08",
      status: "Sắp tới",
    },
  ];

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#0f172a" }}>
        Lịch bảo trì định kỳ
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#f8fafc",
              textAlign: "left",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <th style={{ padding: "12px 16px" }}>Mã kế hoạch</th>
            <th style={{ padding: "12px 16px" }}>Tên công việc</th>
            <th style={{ padding: "12px 16px" }}>Chu kỳ</th>
            <th style={{ padding: "12px 16px" }}>Ngày thực hiện tiếp theo</th>
            <th style={{ padding: "12px 16px" }}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "12px 16px", fontWeight: "bold" }}>
                {item.id}
              </td>
              <td style={{ padding: "12px 16px" }}>{item.name}</td>
              <td style={{ padding: "12px 16px" }}>{item.cycle}</td>
              <td style={{ padding: "12px 16px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CalendarIcon size={16} color="#64748b" /> {item.nextDate}
                </span>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  <Clock size={14} /> {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
