import { Wrench, CheckCircle2, AlertTriangle, Package } from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Tổng thiết bị",
      value: "24",
      icon: Wrench,
      color: "#0284c7",
      bg: "#e0f2fe",
    },
    {
      title: "Lệnh bảo trì cần làm",
      value: "5",
      icon: AlertTriangle,
      color: "#d97706",
      bg: "#fef3c7",
    },
    {
      title: "Đã hoàn thành",
      value: "18",
      icon: CheckCircle2,
      color: "#16a34a",
      bg: "#dcfce7",
    },
    {
      title: "Phụ tùng sắp hết",
      value: "3",
      icon: Package,
      color: "#dc2626",
      bg: "#fee2e2",
    },
  ];

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#0f172a" }}>
        Tổng quan hệ thống (Dashboard)
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "30px",
        }}
      >
        {stats.map((s, index) => {
          const IconComponent = s.icon;
          return (
            <div
              key={index}
              style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "8px",
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconComponent size={24} color={s.color} />
              </div>
              <div>
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                  {s.title}
                </p>
                <h3
                  style={{
                    margin: "4px 0 0 0",
                    color: "#0f172a",
                    fontSize: "24px",
                  }}
                >
                  {s.value}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#0f172a" }}>Lịch bảo trì gần đây</h3>
        <p style={{ color: "#64748b" }}>
          Hệ thống hoạt động bình thường. Không có cảnh báo khẩn cấp.
        </p>
      </div>
    </div>
  );
}
