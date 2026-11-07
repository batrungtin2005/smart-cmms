import { BarChart3, TrendingUp, ShieldAlert } from "lucide-react";

export default function Reports() {
  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#0f172a" }}>
        Báo cáo & Thống kê
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <BarChart3 color="#0284c7" />
            <h3 style={{ margin: 0 }}>Tần suất sự cố thiết bị</h3>
          </div>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Thống kê các thiết bị gặp sự cố sự cố nhiều nhất trong tháng.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <TrendingUp color="#16a34a" />
            <h3 style={{ margin: 0 }}>Chi phí phụ tùng đã dùng</h3>
          </div>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Tổng ngân sách đã chi cho việc thay thế vật tư, linh kiện.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <ShieldAlert color="#d97706" />
            <h3 style={{ margin: 0 }}>Chỉ số MTTR / MTBF</h3>
          </div>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Thời gian trung bình xử lý sự cố và thời gian hoạt động giữa các lần
            hỏng.
          </p>
        </div>
      </div>
    </div>
  );
}
