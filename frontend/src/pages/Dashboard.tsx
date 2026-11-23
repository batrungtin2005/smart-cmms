import {
  Wrench,
  Activity,
  Clock,
  CheckCircle2,
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

  const urgentWorkOrders = [
    {
      id: "WO-2026-0984",
      asset: "Máy nén khí trục vít Atlas Copco #02",
      issue: "Áp suất đầu ra giảm đột ngột, cảnh báo quá nhiệt",
      assignee: "Nguyễn Văn An",
      status: "OPEN",
      dueDate: "Hôm nay, 14:00",
    },
    {
      id: "WO-2026-0991",
      asset: "Băng tải đóng gói tự động Line 1",
      issue: "Đứt dây curoa truyền động chính, dừng dây chuyền",
      assignee: "Trần Minh Khoa",
      status: "IN_PROGRESS",
      dueDate: "Hôm nay, 16:30",
    },
    {
      id: "WO-2026-0995",
      asset: "Máy CNC Phay đứng Makino F5",
      issue: "Lỗi cảm biến trục chính Spindle Alarm 401",
      assignee: "Lê Hoàng Nam",
      status: "ASSIGNED",
      dueDate: "Ngày mai, 09:00",
    },
    {
      id: "WO-2026-0998",
      asset: "Hệ thống làm lạnh Chiller Trane #01",
      issue: "Rò rỉ môi chất lạnh tại van tiết lưu",
      assignee: "Chưa phân công",
      status: "OPEN",
      dueDate: "Quá hạn 2 giờ",
    },
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
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
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
                <Legend />
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
                <Legend />
                <Bar dataKey="completed" name="Hoàn thành" fill="#16a34a" />
                <Bar dataKey="inProgress" name="Đang sửa" fill="#d97706" />
                <Bar dataKey="open" name="Chờ xử lý" fill="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bảng công việc khẩn cấp */}
      <div
        style={{
          background: "#fff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlert size={20} color="#dc2626" />
            <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
              Danh sách công việc cần xử lý khẩn cấp (High Priority)
            </h3>
          </div>
          <a
            href="/work-orders"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "13px",
              color: "#0284c7",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Xem tất cả phiếu <ArrowUpRight size={16} />
          </a>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            textAlign: "left",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid #e2e8f0",
                color: "#64748b",
                backgroundColor: "#f8fafc",
              }}
            >
              <th style={{ padding: "10px 12px" }}>Mã phiếu</th>
              <th style={{ padding: "10px 12px" }}>Thiết bị</th>
              <th style={{ padding: "10px 12px" }}>Sự cố ghi nhận</th>
              <th style={{ padding: "10px 12px" }}>Kỹ thuật viên</th>
              <th style={{ padding: "10px 12px" }}>Trạng thái</th>
              <th style={{ padding: "10px 12px" }}>Hạn xử lý</th>
            </tr>
          </thead>
          <tbody>
            {urgentWorkOrders.map((wo) => (
              <tr
                key={wo.id}
                style={{ borderBottom: "1px solid #f1f5f9", color: "#1e293b" }}
              >
                <td
                  style={{
                    padding: "12px",
                    fontWeight: "bold",
                    color: "#dc2626",
                  }}
                >
                  {wo.id}
                </td>
                <td style={{ padding: "12px", fontWeight: 500 }}>{wo.asset}</td>
                <td style={{ padding: "12px", color: "#475569" }}>
                  {wo.issue}
                </td>
                <td style={{ padding: "12px" }}>{wo.assignee}</td>
                <td style={{ padding: "12px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor:
                        wo.status === "IN_PROGRESS" ? "#fef3c7" : "#fee2e2",
                      color:
                        wo.status === "IN_PROGRESS" ? "#b45309" : "#b91c1c",
                    }}
                  >
                    {wo.status}
                  </span>
                </td>
                <td
                  style={{
                    padding: "12px",
                    fontSize: "13px",
                    color: wo.dueDate.includes("Quá hạn")
                      ? "#dc2626"
                      : "#64748b",
                    fontWeight: wo.dueDate.includes("Quá hạn")
                      ? "bold"
                      : "normal",
                  }}
                >
                  {wo.dueDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
