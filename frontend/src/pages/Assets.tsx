import React, { useState } from "react";

export default function Assets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Mock dữ liệu danh sách thiết bị
  const assetsList = [
    {
      id: "EQ-001",
      name: "Máy nén khí trục vít #1",
      location: "Xưởng A",
      status: "Hoạt động",
      qr: "QR_CODE_EQ_001",
    },
    {
      id: "EQ-002",
      name: "Hệ thống điện lạnh trung tâm",
      location: "Xưởng B",
      status: "Bảo trì",
      qr: "QR_CODE_EQ_002",
    },
    {
      id: "EQ-003",
      name: "Cần cẩu trục 5 tấn",
      location: "Kho tổng",
      status: "Ngừng hoạt động",
      qr: "QR_CODE_EQ_003",
    },
  ];

  const filteredAssets = assetsList.filter((item) => {
    const matchId = item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchId && matchStatus;
  });

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h2>Quản lý Thiết bị & Sinh mã QR</h2>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div style={{ display: "flex", gap: "16px", margin: "20px 0" }}>
        <input
          type="text"
          placeholder="Tìm kiếm theo mã (VD: EQ-001)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px",
            width: "300px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        >
          <option value="ALL">Tất cả tình trạng</option>
          <option value="Hoạt động">Hoạt động</option>
          <option value="Bảo trì">Bảo trì</option>
          <option value="Ngừng hoạt động">Ngừng hoạt động</option>
        </select>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
            <th style={{ padding: "12px" }}>Mã thiết bị</th>
            <th style={{ padding: "12px" }}>Tên thiết bị</th>
            <th style={{ padding: "12px" }}>Vị trí</th>
            <th style={{ padding: "12px" }}>Tình trạng</th>
            <th style={{ padding: "12px" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filteredAssets.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px" }}>{item.id}</td>
              <td style={{ padding: "12px" }}>{item.name}</td>
              <td style={{ padding: "12px" }}>{item.location}</td>
              <td style={{ padding: "12px" }}>{item.status}</td>
              <td style={{ padding: "12px" }}>
                <button
                  onClick={() => setSelectedAsset(item)}
                  style={{
                    padding: "6px 12px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Chi tiết & QR
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal chi tiết & Sinh mã QR in */}
      {selectedAsset && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
              width: "400px",
              textAlign: "center",
            }}
          >
            <h3>Chi tiết thiết bị: {selectedAsset.id}</h3>
            <p>
              <strong>Tên:</strong> {selectedAsset.name}
            </p>
            <p>
              <strong>Vị trí:</strong> {selectedAsset.location}
            </p>
            <p>
              <strong>Tình trạng:</strong> {selectedAsset.status}
            </p>

            <div
              style={{
                margin: "20px 0",
                padding: "15px",
                background: "#f9fafb",
                border: "1px dashed #000",
                display: "inline-block",
              }}
            >
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  background: "#000",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                  fontSize: "12px",
                }}
              >
                [QR: {selectedAsset.qr}]
              </div>
            </div>
            <div>
              <button
                onClick={() => alert("Đang kết nối máy in để in mã QR...")}
                style={{
                  padding: "8px 16px",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginRight: "10px",
                }}
              >
                In mã QR
              </button>
              <button
                onClick={() => setSelectedAsset(null)}
                style={{
                  padding: "8px 16px",
                  background: "#dc2626",
                  color: "#fff",
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
