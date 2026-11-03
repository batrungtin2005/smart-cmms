import { ClipboardList, Plus } from "lucide-react";

export default function WorkOrders() {
  const orders = [
    {
      id: "WO-001",
      title: "Thay lọc dầu máy nén khí",
      priority: "HIGH",
      assignee: "Nguyễn Văn A",
      status: "IN_PROGRESS",
    },
    {
      id: "WO-002",
      title: "Kiểm tra động cơ băng tải",
      priority: "MEDIUM",
      assignee: "Trần Văn B",
      status: "PENDING",
    },
  ];

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
        <h2 style={{ margin: 0, color: "#0f172a" }}>
          Quản lý Phiếu bảo trì (Work Orders)
        </h2>
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
          <Plus size={18} /> Tạo phiếu mới
        </button>
      </div>

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
            <th style={{ padding: "12px 16px" }}>Mã phiếu</th>
            <th style={{ padding: "12px 16px" }}>Nội dung công việc</th>
            <th style={{ padding: "12px 16px" }}>Mức độ ưu tiên</th>
            <th style={{ padding: "12px 16px" }}>Người thực hiện</th>
            <th style={{ padding: "12px 16px" }}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "12px 16px", fontWeight: "bold" }}>
                {item.id}
              </td>
              <td style={{ padding: "12px 16px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ClipboardList size={16} color="#64748b" /> {item.title}
                </span>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    background:
                      item.priority === "HIGH" ? "#fee2e2" : "#fef3c7",
                    color: item.priority === "HIGH" ? "#b91c1c" : "#b45309",
                  }}
                >
                  {item.priority === "HIGH" ? "Cao" : "Trung bình"}
                </span>
              </td>
              <td style={{ padding: "12px 16px" }}>{item.assignee}</td>
              <td style={{ padding: "12px 16px" }}>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    background:
                      item.status === "IN_PROGRESS" ? "#e0f2fe" : "#f1f5f9",
                    color:
                      item.status === "IN_PROGRESS" ? "#0369a1" : "#475569",
                  }}
                >
                  {item.status === "IN_PROGRESS"
                    ? "Đang xử lý"
                    : "Chờ tiếp nhận"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
