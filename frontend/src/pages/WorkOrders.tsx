import { useState } from "react";
import { Search, Filter, LayoutGrid, List } from "lucide-react";

interface WorkOrder {
  id: string;
  title: string;
  assetName: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  assignee: string;
}

// Sinh tự động 1.000 phiếu Work Orders mẫu
const mockWorkOrders: WorkOrder[] = Array.from({ length: 1000 }, (_, i) => {
  const statuses: WorkOrder["status"][] = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "COMPLETED",
    "CLOSED",
  ];
  const priorities: WorkOrder["priority"][] = ["LOW", "MEDIUM", "HIGH"];
  return {
    id: `WO-${1000 + i + 1}`,
    title: `Bảo trì & Sửa chữa thiết bị #${(i % 300) + 1}`,
    assetName: `Thiết bị công nghiệp #${(i % 300) + 1}`,
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    createdAt: `2026-11-${((i % 28) + 1).toString().padStart(2, "0")}`,
    assignee: `Kỹ thuật viên ${(i % 5) + 1}`,
  };
});

export default function WorkOrders() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredOrders = mockWorkOrders.filter((wo) => {
    const matchSearch =
      wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.assetName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "ALL" || wo.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const columns: { key: WorkOrder["status"]; label: string; color: string }[] =
    [
      { key: "OPEN", label: "Mới ghi nhận (OPEN)", color: "#64748b" },
      { key: "ASSIGNED", label: "Đã phân công", color: "#0284c7" },
      { key: "IN_PROGRESS", label: "Đang sửa chữa", color: "#d97706" },
      { key: "COMPLETED", label: "Đã hoàn thành", color: "#16a34a" },
      { key: "CLOSED", label: "Đã nghiệm thu", color: "#475569" },
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
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>
            Quản lý Work Orders ({mockWorkOrders.length} phiếu)
          </h2>
          <p
            style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            Theo dõi tiến độ sửa chữa thiết bị theo mô hình Kanban 5 cột
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            background: "#e2e8f0",
            padding: "4px",
            borderRadius: "6px",
          }}
        >
          <button
            onClick={() => setViewMode("kanban")}
            style={{
              padding: "6px 12px",
              border: "none",
              borderRadius: "4px",
              background: viewMode === "kanban" ? "#fff" : "transparent",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <LayoutGrid size={16} /> Kanban
          </button>
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
            <List size={16} /> Danh sách
          </button>
        </div>
      </div>

      {/* Thanh lọc */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          background: "#fff",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f8fafc",
            padding: "8px 12px",
            borderRadius: "6px",
            flex: 1,
            border: "1px solid #cbd5e1",
          }}
        >
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Tìm phiếu, thiết bị..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              width: "100%",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f8fafc",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
          }}
        >
          <Filter size={18} color="#64748b" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* Chế độ Kanban */}
      {viewMode === "kanban" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "12px",
            overflowX: "auto",
            minHeight: "500px",
          }}
        >
          {columns.map((col) => {
            const colOrders = filteredOrders.filter(
              (wo) => wo.status === col.key,
            );
            return (
              <div
                key={col.key}
                style={{
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
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
                    style={{
                      fontWeight: "bold",
                      fontSize: "13px",
                      color: col.color,
                    }}
                  >
                    {col.label}
                  </span>
                  <span
                    style={{
                      background: "#e2e8f0",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                  >
                    {colOrders.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {colOrders.slice(0, 15).map((wo) => (
                    <div
                      key={wo.id}
                      style={{
                        background: "#fff",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "bold",
                            color: "#0284c7",
                            fontSize: "12px",
                          }}
                        >
                          {wo.id}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background:
                              wo.priority === "HIGH" ? "#fee2e2" : "#f1f5f9",
                            color:
                              wo.priority === "HIGH" ? "#dc2626" : "#475569",
                          }}
                        >
                          {wo.priority}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: "0 0 6px 0",
                          fontSize: "13px",
                          fontWeight: "500",
                        }}
                      >
                        {wo.title}
                      </p>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        KTV: {wo.assignee}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Chế độ Danh sách */
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
                <th style={{ padding: "12px" }}>Mã phiếu</th>
                <th style={{ padding: "12px" }}>Tên sự cố</th>
                <th style={{ padding: "12px" }}>Thiết bị</th>
                <th style={{ padding: "12px" }}>Độ ưu tiên</th>
                <th style={{ padding: "12px" }}>Trạng thái</th>
                <th style={{ padding: "12px" }}>Người thực hiện</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((wo) => (
                <tr
                  key={wo.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: "14px",
                  }}
                >
                  <td style={{ padding: "12px", fontWeight: "bold" }}>
                    {wo.id}
                  </td>
                  <td style={{ padding: "12px" }}>{wo.title}</td>
                  <td style={{ padding: "12px", color: "#64748b" }}>
                    {wo.assetName}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        background:
                          wo.priority === "HIGH" ? "#fee2e2" : "#f1f5f9",
                        color: wo.priority === "HIGH" ? "#dc2626" : "#475569",
                      }}
                    >
                      {wo.priority}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontWeight: "bold" }}>
                    {wo.status}
                  </td>
                  <td style={{ padding: "12px", color: "#64748b" }}>
                    {wo.assignee}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              Trang {currentPage} / {totalPages || 1}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                style={{ padding: "6px 12px" }}
              >
                Trước
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                style={{ padding: "6px 12px" }}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
