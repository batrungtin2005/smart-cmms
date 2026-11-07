import { useState } from "react";
import {
  Wrench,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
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

interface CriticalWorkOrder {
  id: string;
  title: string;
  assetName: string;
  reportedAt: string;
  assignee: string;
}

export default function Dashboard() {
  // Dữ liệu biểu đồ tròn: Tỉ lệ tình trạng thiết bị
  const assetStatusData = [
    { name: "Hoạt động", value: 18, color: "#16a34a" },
    { name: "Đang bảo trì", value: 4, color: "#d97706" },
    { name: "Sự cố / Hỏng", value: 2, color: "#dc2626" },
    { name: "Chờ vật tư", value: 2, color: "#0284c7" },
  ];

  // Dữ liệu biểu đồ cột: Phân bổ Work Order theo độ ưu tiên
  const priorityData = [
    { priority: "Cao (High)", open: 3, inProgress: 2, completed: 5 },
    { priority: "Trung bình (Medium)", open: 4, inProgress: 6, completed: 12 },
    { priority: "Thấp (Low)", open: 2, inProgress: 3, completed: 8 },
  ];

  // Danh sách Work Order cần xử lý khẩn cấp (HIGH)
  const criticalOrders: CriticalWorkOrder[] = [
    {
      id: "WO-101",
      title: "Thay bộ lọc dầu định kỳ",
      assetName: "Máy nén khí Piston 15HP",
      reportedAt: "08:30 Hôm nay",
      assignee: "Chưa phân công",
    },
    {
      id: "WO-103",
      title: "Sửa lỗi cảm biến nhiệt độ",
      assetName: "Lò nhiệt luyện L-01",
      reportedAt: "10:15 Hôm nay",
      assignee: "Trần Văn B",
    },
  ];

  return (
    <div style={{ paddingBottom: "30px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>
          Tổng quan hệ thống (Dashboard Quản trị)
        </h2>
        <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
          Theo dõi các chỉ số hiệu suất bảo trì KPI, tình trạng thiết bị và sự
          cố khẩn cấp
        </p>
      </div>

      {/* Grid 4 thẻ KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* KPI 1: MTTR */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span
              style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}
            >
              MTTR (T.gian sửa trung bình)
            </span>
            <div
              style={{
                background: "#e0f2fe",
                color: "#0284c7",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <Clock size={20} />
            </div>
          </div>
          <div
            style={{ fontSize: "26px", fontWeight: "bold", color: "#0f172a" }}
          >
            2.4 giờ
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#16a34a",
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <TrendingUp size={14} /> Giảm 12% so với tháng trước
          </div>
        </div>

        {/* KPI 2: MTBF */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span
              style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}
            >
              MTBF (T.gian giữa 2 sự cố)
            </span>
            <div
              style={{
                background: "#dcfce7",
                color: "#16a34a",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <Activity size={20} />
            </div>
          </div>
          <div
            style={{ fontSize: "26px", fontWeight: "bold", color: "#0f172a" }}
          >
            185 giờ
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#16a34a",
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <TrendingUp size={14} /> Tăng 8.5% độ tin cậy máy
          </div>
        </div>

        {/* KPI 3: OEE */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span
              style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}
            >
              Hiệu suất thiết bị (OEE)
            </span>
            <div
              style={{
                background: "#fef3c7",
                color: "#d97706",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <Wrench size={20} />
            </div>
          </div>
          <div
            style={{ fontSize: "26px", fontWeight: "bold", color: "#0f172a" }}
          >
            87.5%
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
            Mục tiêu nhà máy: &gt; 85%
          </div>
        </div>

        {/* KPI 4: Work Orders */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span
              style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}
            >
              Tổng Work Orders
            </span>
            <div
              style={{
                background: "#f1f5f9",
                color: "#475569",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div
            style={{ fontSize: "26px", fontWeight: "bold", color: "#0f172a" }}
          >
            45 phiếu
          </div>
          <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "6px" }}>
            Tỉ lệ hoàn thành: 88.8%
          </div>
        </div>
      </div>

      {/* 2 Biểu đồ chính */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Biểu đồ tròn */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#0f172a" }}
          >
            Tỉ lệ tình trạng thiết bị
          </h3>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
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
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "10px",
            }}
          >
            {assetStatusData.map((item) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#475569",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: item.color,
                    display: "inline-block",
                  }}
                ></span>
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </div>

        {/* Biểu đồ cột */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <h3
            style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#0f172a" }}
          >
            Phân bổ Work Order theo độ ưu tiên
          </h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="priority" style={{ fontSize: "12px" }} />
                <YAxis style={{ fontSize: "12px" }} />
                <Tooltip />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                />
                <Bar
                  dataKey="open"
                  name="Chờ xử lý"
                  fill="#64748b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="inProgress"
                  name="Đang làm"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="completed"
                  name="Hoàn thành"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
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
            <ShieldAlert color="#dc2626" size={22} />
            <h3 style={{ margin: 0, fontSize: "16px", color: "#991b1b" }}>
              Sự cố cần xử lý khẩn cấp (Priority: HIGH)
            </h3>
          </div>
          <span
            style={{
              fontSize: "12px",
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "4px 10px",
              borderRadius: "12px",
              fontWeight: "bold",
            }}
          >
            {criticalOrders.length} sự cố chưa xong
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
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
                <th style={{ padding: "10px 14px" }}>Mã phiếu</th>
                <th style={{ padding: "10px 14px" }}>Nội dung sự cố</th>
                <th style={{ padding: "10px 14px" }}>Thiết bị bị ảnh hưởng</th>
                <th style={{ padding: "10px 14px" }}>Thời gian báo</th>
                <th style={{ padding: "10px 14px" }}>KTV Đảm nhận</th>
                <th style={{ padding: "10px 14px" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {criticalOrders.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: "14px",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 14px",
                      fontWeight: "bold",
                      color: "#dc2626",
                    }}
                  >
                    {item.id}
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: "500" }}>
                    {item.title}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#475569" }}>
                    {item.assetName}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#64748b",
                      fontSize: "13px",
                    }}
                  >
                    {item.reportedAt}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        background: "#f1f5f9",
                        color: "#334155",
                      }}
                    >
                      {item.assignee}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        background: "#0284c7",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      Xử lý ngay <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
