import { useState } from "react";
import { AlertTriangle, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface Part {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
}

export default function Parts() {
  const [partsList, setPartsList] = useState<Part[]>([
    {
      id: "PRT-01",
      name: "Vòng bi SKF 6205",
      stock: 5,
      minStock: 10,
      unit: "Cái",
      price: 120000,
    },
    {
      id: "PRT-02",
      name: "Lọc gió máy nén khí",
      stock: 25,
      minStock: 8,
      unit: "Bộ",
      price: 350000,
    },
    {
      id: "PRT-03",
      name: "Dầu thủy lực ISO VG 68",
      stock: 40,
      minStock: 50,
      unit: "Lít",
      price: 85000,
    },
  ]);

  const [activeModal, setActiveModal] = useState<"IN" | "OUT" | null>(null);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const handleStockTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setPartsList((prev) =>
      prev.map((part) => {
        if (part.id === selectedPartId) {
          const newStock =
            activeModal === "IN"
              ? part.stock + quantity
              : part.stock - quantity;
          return { ...part, stock: Math.max(0, newStock) };
        }
        return part;
      }),
    );
    setActiveModal(null);
    setQuantity(1);
  };

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
          Quản lý Phụ tùng & Tồn kho
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setActiveModal("IN")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <ArrowDownLeft size={18} /> Nhập Kho
          </button>
          <button
            onClick={() => setActiveModal("OUT")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              background: "#ea580c",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <ArrowUpRight size={18} /> Xuất Kho
          </button>
        </div>
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
            <th style={{ padding: "12px 16px" }}>Mã phụ tùng</th>
            <th style={{ padding: "12px 16px" }}>Tên phụ tùng</th>
            <th style={{ padding: "12px 16px" }}>Tồn kho</th>
            <th style={{ padding: "12px 16px" }}>Ngưỡng tối thiểu</th>
            <th style={{ padding: "12px 16px" }}>Đơn giá (VND)</th>
            <th style={{ padding: "12px 16px" }}>Cảnh báo</th>
          </tr>
        </thead>
        <tbody>
          {partsList.map((part) => {
            const isLowStock = part.stock <= part.minStock;
            return (
              <tr key={part.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 16px", fontWeight: "bold" }}>
                  {part.id}
                </td>
                <td style={{ padding: "12px 16px" }}>{part.name}</td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontWeight: "bold",
                    color: isLowStock ? "#dc2626" : "#0f172a",
                  }}
                >
                  {part.stock} {part.unit}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {part.minStock} {part.unit}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {part.price.toLocaleString("vi-VN")}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {isLowStock ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#dc2626",
                        background: "#fee2e2",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      <AlertTriangle size={14} /> Sắp hết
                    </span>
                  ) : (
                    <span
                      style={{
                        color: "#16a34a",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      An toàn
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {activeModal && (
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
          }}
        >
          <form
            onSubmit={handleStockTransaction}
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "8px",
              width: "360px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {activeModal === "IN"
                ? "Phiếu Nhập Kho Phụ Tùng"
                : "Phiếu Xuất Kho Phụ Tùng"}
            </h3>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "14px",
                }}
              >
                Chọn phụ tùng
              </label>
              <select
                required
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                }}
              >
                <option value="">-- Chọn phụ tùng --</option>
                {partsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Hiện có: {p.stock})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "14px",
                }}
              >
                Số lượng
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: "10px",
                  background: activeModal === "IN" ? "#16a34a" : "#ea580c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#e2e8f0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
