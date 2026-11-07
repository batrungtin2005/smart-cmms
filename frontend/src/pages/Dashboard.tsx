import {
  Wrench,
  Activity,
  Clock,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

export default function Dashboard() {
  const assetStatusData = [
    { name: "Hoạt động", value: 270, color: "#16a34a" },
    { name: "Đang bảo trì", value: 20, color: "#d97706" },
    { name: "Sự cố / Hỏng", value: 10, color: "#dc2626" },
  ];

  const priorityData = [
    { priority: "High (Cao)", open: 15, inProgress: 25, completed: 160 },
    { priority: "Medium (TB)", open: 40, inProgress: 80, completed: 380 },
    { priority: "Low (Thấp)", open: 30, inProgress: 50, completed: 220 },
  ];

  return (
    <div style={{ paddingBottom: "30px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, color: "#0f172a" }}>
          Dashboard Quản trị (KPI Analytics)
        </h2>
        <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
          Báo cáo thời gian thực chỉ số vận hành và tình trạng thiết bị
        </p>
      </div>

      {/* Grid 4 Thẻ KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}
            >
              MTTR (T.gian sửa TB)
            </span>
            <Clock size={20} color="#0284c7" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>2.4 giờ</div>
          <span style={{ fontSize: "12px", color: "#16a34a" }}>
            Giảm 12% so với tháng trước
          </span>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}
            >
              MTBF (T.gian giữa 2 sự cố)
            </span>
            <Activity size={20} color="#16a34a" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>185 giờ</div>
          <span style={{ fontSize: "12px", color: "#16a34a" }}>
            Tăng 8.5% độ tin cậy máy
          </span>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}
            >
              Hiệu suất máy (OEE)
            </span>
            <Wrench size={20} color="#d97706" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>87.5%</div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Đạt mục tiêu nhà máy
          </span>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}
            >
              Tổng Work Orders
            </span>
            <CheckCircle2 size={20} color="#475569" />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            1,000 phiếu
          </div>
          <span style={{ fontSize: "12px", color: "#16a34a" }}>
            100% dữ liệu đã load
          </span>
        </div>
      </div>

      {/* Biểu đồ Recharts */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
            Tỉ lệ tình trạng 300 thiết bị
          </h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  dataKey="value"
                >
                  {assetStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>
            Phân bổ 1.000 phiếu theo độ ưu tiên
          </h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" name="Hoàn thành" fill="#16a34a" />
                <Bar dataKey="inProgress" name="Đang sửa" fill="#d97706" />
                <Bar dataKey="open" name="Chờ xử lý" fill="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
