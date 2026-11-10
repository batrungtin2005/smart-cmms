import { useState } from "react";
import {
  Plus,
  LayoutGrid,
  List as ListIcon,
  UserCheck,
  Clock,
  X,
} from "lucide-react";

interface WorkOrder {
  id: string;
  title: string;
  assetName: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  assignee: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  dueDate: string;
  partUsed?: string;
}

export default function WorkOrders() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([
    {
      id: "WO-101",
      title: "Thay bộ lọc dầu định kỳ",
      assetName: "Máy nén khí Piston 15HP",
      priority: "HIGH",
      assignee: "Chưa phân công",
      status: "OPEN",
      dueDate: "2026-11-05",
    },
    {
      id: "WO-102",
      title: "Cân chỉnh dây curoa",
      assetName: "Băng tải đóng gói SP-02",
      priority: "MEDIUM",
      assignee: "Nguyễn Văn A",
      status: "ASSIGNED",
      dueDate: "2026-11-06",
    },
    {
      id: "WO-103",
      title: "Sửa lỗi cảm biến nhiệt độ",
      assetName: "Lò nhiệt luyện L-01",
      priority: "HIGH",
      assignee: "Trần Văn B",
      status: "IN_PROGRESS",
      dueDate: "2026-11-04",
      partUsed: "Cảm biến nhiệt PT100",
    },
    {
      id: "WO-104",
      title: "Tra mỡ vòng bi ổ trục",
      assetName: "Máy quạt hút công nghiệp",
      priority: "LOW",
      assignee: "Lê Văn C",
      status: "COMPLETED",
      dueDate: "2026-11-02",
      partUsed: "Mỡ bôi trơn SKF",
    },
    {
      id: "WO-105",
      title: "Bảo dưỡng tổng thể quý 3",
      assetName: "Máy phay CNC 5 trục",
      priority: "MEDIUM",
      assignee: "Nguyễn Văn A",
      status: "CLOSED",
      dueDate: "2026-10-28",
    },
  ]);

  const [newWO, setNewWO] = useState({
    title: "",
    assetName: "",
    priority: "MEDIUM" as "HIGH" | "MEDIUM" | "LOW",
    assignee: "",
    partUsed: "",
  });

  const handleCreateWO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWO.title || !newWO.assetName) return;

    const createdItem: WorkOrder = {
      id: `WO-${100 + workOrders.length + 1}`,
      title: newWO.title,
      assetName: newWO.assetName,
      priority: newWO.priority,
      assignee: newWO.assignee || "Chưa phân công",
      status: newWO.assignee ? "ASSIGNED" : "OPEN",
      dueDate: new Date().toISOString().split("T")[0],
      partUsed: newWO.partUsed,
    };

    setWorkOrders([createdItem, ...workOrders]);
    setIsModalOpen(false);
    setNewWO({
      title: "",
      assetName: "",
      priority: "MEDIUM",
      assignee: "",
      partUsed: "",
    });
  };

  const kanbanColumns = [
    { key: "OPEN", label: "Mới tạo (Open)", color: "#64748b", bg: "#f1f5f9" },
    {
      key: "ASSIGNED",
      label: "Đã giao (Assigned)",
      color: "#0284c7",
      bg: "#e0f2fe",
    },
    {
      key: "IN_PROGRESS",
      label: "Đang xử lý (In Progress)",
      color: "#d97706",
      bg: "#fef3c7",
    },
    {
      key: "COMPLETED",
      label: "Đã hoàn thành (Completed)",
      color: "#16a34a",
      bg: "#dcfce7",
    },
    {
      key: "CLOSED",
      label: "Đã nghiệm thu (Closed)",
      color: "#475569",
      bg: "#e2e8f0",
    },
  ];

  return (
    <div style={{ paddingBottom: "30px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>
            Quản lý Phiếu bảo trì (Work Orders)
          </h2>
          <p
            style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            Theo dõi và phân công công việc bảo trì cho kỹ thuật viên
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div
            style={{
              background: "#e2e8f0",
              padding: "3px",
              borderRadius: "8px",
              display: "flex",
            }}
          >
            <button
              onClick={() => setViewMode("kanban")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                border: "none",
                borderRadius: "6px",
                background: viewMode === "kanban" ? "#fff" : "transparent",
                color: viewMode === "kanban" ? "#0284c7" : "#64748b",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow:
                  viewMode === "kanban" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <LayoutGrid size={16} /> Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                border: "none",
                borderRadius: "6px",
                background: viewMode === "table" ? "#fff" : "transparent",
                color: viewMode === "table" ? "#0284c7" : "#64748b",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow:
                  viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <ListIcon size={16} /> Danh sách
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
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
      </div>

      {viewMode === "kanban" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {kanbanColumns.map((col) => {
            const filteredOrders = workOrders.filter(
              (wo) => wo.status === col.key,
            );
            return (
              <div
                key={col.key}
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                    borderBottom: `2px solid ${col.color}`,
                    paddingBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "#334155",
                      fontSize: "14px",
                    }}
                  >
                    {col.label}
                  </span>
                  <span
                    style={{
                      background: col.bg,
                      color: col.color,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {filteredOrders.length}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {filteredOrders.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: "#fff",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: "#0284c7",
                          }}
                        >
                          {item.id}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background:
                              item.priority === "HIGH"
                                ? "#fee2e2"
                                : item.priority === "MEDIUM"
                                  ? "#fef3c7"
                                  : "#e0f2fe",
                            color:
                              item.priority === "HIGH"
                                ? "#b91c1c"
                                : item.priority === "MEDIUM"
                                  ? "#b45309"
                                  : "#0369a1",
                          }}
                        >
                          {item.priority}
                        </span>
                      </div>

                      <h4
                        style={{
                          margin: "0 0 6px 0",
                          fontSize: "14px",
                          color: "#0f172a",
                        }}
                      >
                        {item.title}
                      </h4>
                      <p
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        🛠️ {item.assetName}
                      </p>

                      {item.partUsed && (
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "11px",
                            color: "#475569",
                            background: "#f1f5f9",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          📦 Linh kiện: {item.partUsed}
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTop: "1px solid #f1f5f9",
                          paddingTop: "8px",
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <UserCheck size={14} /> {item.assignee}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Clock size={14} /> {item.dueDate}
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredOrders.length === 0 && (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "13px",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "6px",
                      }}
                    >
                      Không có phiếu nào
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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
                  fontSize: "14px",
                }}
              >
                <th style={{ padding: "12px 16px" }}>Mã phiếu</th>
                <th style={{ padding: "12px 16px" }}>Nội dung công việc</th>
                <th style={{ padding: "12px 16px" }}>Thiết bị</th>
                <th style={{ padding: "12px 16px" }}>Mức ưu tiên</th>
                <th style={{ padding: "12px 16px" }}>Kỹ thuật viên</th>
                <th style={{ padding: "12px 16px" }}>Trạng thái</th>
                <th style={{ padding: "12px 16px" }}>Hạn hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: "14px",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: "bold",
                      color: "#0284c7",
                    }}
                  >
                    {item.id}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: "500" }}>
                    {item.title}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>
                    {item.assetName}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        background:
                          item.priority === "HIGH"
                            ? "#fee2e2"
                            : item.priority === "MEDIUM"
                              ? "#fef3c7"
                              : "#e0f2fe",
                        color:
                          item.priority === "HIGH"
                            ? "#b91c1c"
                            : item.priority === "MEDIUM"
                              ? "#b45309"
                              : "#0369a1",
                      }}
                    >
                      {item.priority === "HIGH"
                        ? "Cao"
                        : item.priority === "MEDIUM"
                          ? "Trung bình"
                          : "Thấp"}
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
                        background: "#f1f5f9",
                        color: "#334155",
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>
                    {item.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "500px",
              padding: "24px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, color: "#0f172a" }}>
                Tạo phiếu bảo trì mới
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateWO}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}
                >
                  Tên công việc / Sự cố *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kiểm tra chảy dầu máy nén khí"
                  value={newWO.title}
                  onChange={(e) =>
                    setNewWO({ ...newWO, title: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}
                >
                  Thiết bị áp dụng *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Máy phay CNC 5 trục"
                  value={newWO.assetName}
                  onChange={(e) =>
                    setNewWO({ ...newWO, assetName: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "bold",
                      marginBottom: "6px",
                    }}
                  >
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={newWO.priority}
                    onChange={(e) =>
                      setNewWO({ ...newWO, priority: e.target.value as any })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      background: "#fff",
                    }}
                  >
                    <option value="LOW">Thấp (Low)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="HIGH">Cao (High)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "bold",
                      marginBottom: "6px",
                    }}
                  >
                    Phân công KTV
                  </label>
                  <input
                    type="text"
                    placeholder="Tên kỹ thuật viên"
                    value={newWO.assignee}
                    onChange={(e) =>
                      setNewWO({ ...newWO, assignee: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}
                >
                  Vật tư / Phụ tùng sử dụng (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Vòng bi SKF 6205, Mỡ bôi trơn"
                  value={newWO.partUsed}
                  onChange={(e) =>
                    setNewWO({ ...newWO, partUsed: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
