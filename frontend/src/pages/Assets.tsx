import { useState } from "react";
import { Search, Filter, QrCode, Eye, Printer, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  status: "Hoạt động" | "Bảo trì" | "Hỏng";
  qrCode: string;
}

// Sinh tự động 300 thiết bị chuẩn chỉ tiêu nghiệm thu
const mockAssets: Asset[] = Array.from({ length: 300 }, (_, i) => ({
  id: `AST-${(i + 1).toString().padStart(3, "0")}`,
  name: `Thiết bị công nghiệp #${i + 1}`,
  category: i % 2 === 0 ? "Máy gia công" : "Thiết bị điện",
  location: `Xưởng A - Khu ${Math.floor(i / 10) + 1}`,
  status: i % 15 === 0 ? "Hỏng" : i % 8 === 0 ? "Bảo trì" : "Hoạt động",
  qrCode: `AST-${(i + 1).toString().padStart(3, "0")}`,
}));

export default function Assets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Lọc dữ liệu
  const filteredAssets = mockAssets.filter((asset) => {
    const matchSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "ALL" || asset.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Phân trang mượt mà cho 300 thiết bị
  const totalPages = Math.ceil(filteredAssets.length / pageSize);
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handlePrint = () => {
    window.print();
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
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>
            Quản lý Tài sản ({mockAssets.length} thiết bị)
          </h2>
          <p
            style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            Quản lý và in mã QR code dán máy móc công nghiệp
          </p>
        </div>
      </div>

      {/* Thanh tìm kiếm & lọc */}
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
            placeholder="Tìm theo mã hoặc tên thiết bị..."
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
            <option value="Hoạt động">Hoạt động</option>
            <option value="Bảo trì">Bảo trì</option>
            <option value="Hỏng">Hỏng</option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu */}
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
              <th style={{ padding: "12px" }}>Mã máy</th>
              <th style={{ padding: "12px" }}>Tên thiết bị</th>
              <th style={{ padding: "12px" }}>Phân loại</th>
              <th style={{ padding: "12px" }}>Vị trí lắp đặt</th>
              <th style={{ padding: "12px" }}>Trạng thái</th>
              <th style={{ padding: "12px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAssets.map((asset) => (
              <tr
                key={asset.id}
                style={{ borderBottom: "1px solid #f1f5f9", fontSize: "14px" }}
              >
                <td style={{ padding: "12px", fontWeight: "bold" }}>
                  {asset.id}
                </td>
                <td style={{ padding: "12px" }}>{asset.name}</td>
                <td style={{ padding: "12px", color: "#64748b" }}>
                  {asset.category}
                </td>
                <td style={{ padding: "12px", color: "#64748b" }}>
                  {asset.location}
                </td>
                <td style={{ padding: "12px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      background:
                        asset.status === "Hoạt động"
                          ? "#dcfce7"
                          : asset.status === "Bảo trì"
                            ? "#fef3c7"
                            : "#fee2e2",
                      color:
                        asset.status === "Hoạt động"
                          ? "#15803d"
                          : asset.status === "Bảo trì"
                            ? "#b45309"
                            : "#b91c1c",
                    }}
                  >
                    {asset.status}
                  </span>
                </td>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        setSelectedAsset(asset);
                        setShowQRModal(true);
                      }}
                      style={{
                        padding: "6px 10px",
                        background: "#0284c7",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                      }}
                    >
                      <QrCode size={14} /> Mã QR
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Phân trang */}
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
            Trang {currentPage} / {totalPages || 1} (Hiển thị{" "}
            {paginatedAssets.length} / {filteredAssets.length} kết quả)
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              style={{
                padding: "6px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                background: currentPage === 1 ? "#f1f5f9" : "#fff",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Trước
            </button>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              style={{
                padding: "6px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                background:
                  currentPage === totalPages || totalPages === 0
                    ? "#f1f5f9"
                    : "#fff",
                cursor:
                  currentPage === totalPages || totalPages === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Modal In Mã QR */}
      {showQRModal && selectedAsset && (
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
              borderRadius: "12px",
              width: "320px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowQRModal(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
            <h3 style={{ margin: "0 0 12px 0" }}>In Mã QR Thiết Bị</h3>
            <div
              style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                display: "inline-block",
                marginBottom: "12px",
              }}
            >
              <QRCodeSVG value={selectedAsset.qrCode} size={160} />
            </div>
            <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
              {selectedAsset.name}
            </p>
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Mã: {selectedAsset.id}
            </p>
            <button
              onClick={handlePrint}
              style={{
                width: "100%",
                padding: "10px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Printer size={16} /> In Nhãn QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
