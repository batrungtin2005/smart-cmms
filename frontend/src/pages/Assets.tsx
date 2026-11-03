import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Search, Printer, Plus } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  category: string;
  status: "OPERATIONAL" | "MAINTENANCE" | "BROKEN";
  location: string;
}

export default function Assets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const assets: Asset[] = [
    {
      id: "AST-001",
      name: "Máy nén khí Piston 15HP",
      category: "Thiết bị áp lực",
      status: "OPERATIONAL",
      location: "Xưởng A1",
    },
    {
      id: "AST-002",
      name: "Băng tải cao su 20m",
      category: "Hệ thống truyền động",
      status: "MAINTENANCE",
      location: "Xưởng B2",
    },
    {
      id: "AST-003",
      name: "Máy phay CNC 5 trục",
      category: "Cơ khí chính xác",
      status: "BROKEN",
      location: "Xưởng C1",
    },
  ];

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
          Quản lý Tài sản & Thiết bị
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
          <Plus size={18} /> Thêm thiết bị mới
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "8px 12px",
            flex: 1,
          }}
        >
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã thiết bị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: "none", outline: "none", width: "100%" }}
          />
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
            <th style={{ padding: "12px 16px" }}>Mã tài sản</th>
            <th style={{ padding: "12px 16px" }}>Tên thiết bị</th>
            <th style={{ padding: "12px 16px" }}>Phân loại</th>
            <th style={{ padding: "12px 16px" }}>Vị trí</th>
            <th style={{ padding: "12px 16px" }}>Trạng thái</th>
            <th style={{ padding: "12px 16px" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filteredAssets.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "12px 16px", fontWeight: "bold" }}>
                {item.id}
              </td>
              <td style={{ padding: "12px 16px" }}>{item.name}</td>
              <td style={{ padding: "12px 16px" }}>{item.category}</td>
              <td style={{ padding: "12px 16px" }}>{item.location}</td>
              <td style={{ padding: "12px 16px" }}>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    background:
                      item.status === "OPERATIONAL"
                        ? "#dcfce7"
                        : item.status === "MAINTENANCE"
                          ? "#fef3c7"
                          : "#fee2e2",
                    color:
                      item.status === "OPERATIONAL"
                        ? "#15803d"
                        : item.status === "MAINTENANCE"
                          ? "#b45309"
                          : "#b91c1c",
                  }}
                >
                  {item.status === "OPERATIONAL"
                    ? "Hoạt động"
                    : item.status === "MAINTENANCE"
                      ? "Bảo trì"
                      : "Đang hỏng"}
                </span>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <button
                  onClick={() => setSelectedAsset(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <QrCode size={16} /> Mã QR
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedAsset && (
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
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "8px",
              width: "320px",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Tem Mã QR Thiết bị</h3>
            <div
              style={{
                margin: "20px 0",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <QRCodeSVG
                value={JSON.stringify({
                  id: selectedAsset.id,
                  name: selectedAsset.name,
                })}
                size={160}
              />
            </div>
            <p style={{ margin: "4px 0", fontWeight: "bold" }}>
              {selectedAsset.name}
            </p>
            <p style={{ margin: "4px 0", color: "#64748b", fontSize: "14px" }}>
              Mã: {selectedAsset.id}
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px",
                  background: "#0284c7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                <Printer size={16} /> In Tem
              </button>
              <button
                onClick={() => setSelectedAsset(null)}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "#e2e8f0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
