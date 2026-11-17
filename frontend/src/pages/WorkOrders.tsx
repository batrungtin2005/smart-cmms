import { useState } from "react";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Plus,
  X,
  Wrench,
  UserCheck,
} from "lucide-react";

interface UsedPart {
  partId: string;
  name: string;
  qty: number;
}

interface WorkOrder {
  id: string;
  title: string;
  assetName: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  assignee: string;
  usedParts: UsedPart[];
}

const initialWorkOrders: WorkOrder[] = Array.from({ length: 1000 }, (_, i) => {
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
    usedParts:
      i % 2 === 0
        ? [
            { partId: "PRT-01", name: "Vòng bi SKF 6205", qty: 2 },
            { partId: "PRT-03", name: "Dầu thủy lực ISO VG 68", qty: 5 },
          ]
        : [{ partId: "PRT-02", name: "Lọc gió máy nén khí", qty: 1 }],
  };
});

export default function WorkOrders() {
  const [orders, setOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // State Modal Tạo Phiếu Mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAsset, setNewAsset] = useState("Thiết bị công nghiệp #1");
  const [newPriority, setNewPriority] = useState<WorkOrder["priority"]>("HIGH");
  const [newAssignee, setNewAssignee] = useState("Kỹ thuật viên 1");

  // State Modal Chi Tiết & Phân Công
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const filteredOrders = orders.filter((wo) => {
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

  const handleCreateWO = (e: React.FormEvent) => {
    e.preventDefault();
    const created: WorkOrder = {
      id: `WO-${1000 + orders.length + 1}`,
      title: newTitle,
      assetName: newAsset,
      status: "OPEN",
      priority: newPriority,
      createdAt: "2026-11-17",
      assignee: newAssignee,
      usedParts: [],
    };
    setOrders([created, ...orders]);
    setShowCreateModal(false);
    setNewTitle("");
  };

  const handleUpdateWO = (
    id: string,
    updatedAssignee: string,
    updatedStatus: WorkOrder["status"],
  ) => {
    setOrders((prev) =>
      prev.map((wo) =>
        wo.id === id
          ? { ...wo, assignee: updatedAssignee, status: updatedStatus }
          : wo,
      ),
    );
    setSelectedWO(null);
  };

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
            Quản lý Work Orders ({orders.length} phiếu)
          </h2>
          <p
            style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            Bấm vào thẻ phiếu để phân công kỹ thuật viên & xem phụ tùng sử dụng
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
            <Plus size={16} /> Tạo phiếu mới
          </button>

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
                      onClick={() => setSelectedWO(wo)}
                      style={{
                        background: "#fff",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        cursor: "pointer",
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
                  onClick={() => setSelectedWO(wo)}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <td
                    style={{
                      padding: "12px",
                      fontWeight: "bold",
                      color: "#0284c7",
                    }}
                  >
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

      {/* Modal Tạo Phiếu Mới */}
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
            onSubmit={handleCreateWO}
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "10px",
              width: "400px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Tạo Phiếu Công Việc Mới (Work Order)
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                Mô tả sự cố / công việc
              </label>
              <input
                type="text"
                required
                placeholder="VD: Thay vòng bi trục chính..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
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
                Thiết bị gặp sự cố
              </label>
              <input
                type="text"
                required
                value={newAsset}
                onChange={(e) => setNewAsset(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    marginBottom: "4px",
                  }}
                >
                  Mức độ ưu tiên
                </label>
                <select
                  value={newPriority}
                  onChange={(e) =>
                    setNewPriority(e.target.value as WorkOrder["priority"])
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <option value="HIGH">HIGH (Khẩn cấp)</option>
                  <option value="MEDIUM">MEDIUM (Trung bình)</option>
                  <option value="LOW">LOW (Thấp)</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    marginBottom: "4px",
                  }}
                >
                  Phân công KTV
                </label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <option value="Kỹ thuật viên 1">Kỹ thuật viên 1</option>
                  <option value="Kỹ thuật viên 2">Kỹ thuật viên 2</option>
                  <option value="Kỹ thuật viên 3">Kỹ thuật viên 3</option>
                </select>
              </div>
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
                Tạo phiếu
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

      {/* Modal Chi Tiết Phiếu, Phân Công KTV & Phụ Tùng Sử Dụng */}
      {selectedWO && (
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
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "10px",
              width: "450px",
              position: "relative",
            }}
          >
            <button
              onClick={() => setSelectedWO(null)}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>

            <span
              style={{ fontSize: "12px", fontWeight: "bold", color: "#0284c7" }}
            >
              {selectedWO.id} • Ngày tạo: {selectedWO.createdAt}
            </span>
            <h3 style={{ margin: "4px 0 8px 0" }}>{selectedWO.title}</h3>
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              Thiết bị: <strong>{selectedWO.assetName}</strong>
            </p>

            {/* Phân công KTV & Cập nhật trạng thái */}
            <div
              style={{
                background: "#f8fafc",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "16px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "bold",
                  fontSize: "13px",
                  marginBottom: "10px",
                }}
              >
                <UserCheck size={16} color="#0284c7" /> Điều phối & Trạng thái
                xử lý
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Kỹ thuật viên phụ trách
                  </label>
                  <select
                    value={selectedWO.assignee}
                    onChange={(e) =>
                      setSelectedWO({ ...selectedWO, assignee: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: "4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <option value="Kỹ thuật viên 1">Kỹ thuật viên 1</option>
                    <option value="Kỹ thuật viên 2">Kỹ thuật viên 2</option>
                    <option value="Kỹ thuật viên 3">Kỹ thuật viên 3</option>
                    <option value="Kỹ thuật viên 4">Kỹ thuật viên 4</option>
                    <option value="Kỹ thuật viên 5">Kỹ thuật viên 5</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Trạng thái Kanban
                  </label>
                  <select
                    value={selectedWO.status}
                    onChange={(e) =>
                      setSelectedWO({
                        ...selectedWO,
                        status: e.target.value as WorkOrder["status"],
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: "4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Phụ tùng đã sử dụng */}
            <div style={{ marginBottom: "18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "bold",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                <Wrench size={16} color="#d97706" /> Phụ tùng vật tư sử dụng
              </div>
              {selectedWO.usedParts.length > 0 ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "8px" }}>Mã PT</th>
                      <th style={{ padding: "8px" }}>Tên phụ tùng</th>
                      <th style={{ padding: "8px" }}>SL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedWO.usedParts.map((p, idx) => (
                      <tr
                        key={idx}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td style={{ padding: "8px", fontWeight: "bold" }}>
                          {p.partId}
                        </td>
                        <td style={{ padding: "8px" }}>{p.name}</td>
                        <td style={{ padding: "8px" }}>{p.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "#64748b",
                    fontStyle: "italic",
                  }}
                >
                  Chưa ghi nhận vật tư xuất kho cho phiếu này.
                </p>
              )}
            </div>

            <button
              onClick={() =>
                handleUpdateWO(
                  selectedWO.id,
                  selectedWO.assignee,
                  selectedWO.status,
                )
              }
              style={{
                width: "100%",
                padding: "10px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Lưu thay đổi phân công
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
