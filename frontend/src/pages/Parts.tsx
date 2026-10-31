import React from "react";

export default function Parts() {
  const partsList = [
    {
      code: "PT-01",
      name: "Lọc gió máy nén khí",
      stock: 3,
      minStock: 5,
      unit: "Cái",
    },
    {
      code: "PT-02",
      name: "Dầu thủy lực 68",
      stock: 40,
      minStock: 10,
      unit: "Lít",
    },
    {
      code: "PT-03",
      name: "Ron cao su chịu nhiệt",
      stock: 2,
      minStock: 8,
      unit: "Bộ",
    },
  ];

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h2>Quản lý Phụ tùng & Kho vật tư</h2>
      <p>
        Theo dõi tồn kho và tự động cảnh báo khi thấp hơn mức tối thiểu
        (minimum_stock).
      </p>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
            <th style={{ padding: "12px" }}>Mã phụ tùng</th>
            <th style={{ padding: "12px" }}>Tên linh kiện</th>
            <th style={{ padding: "12px" }}>Tồn kho hiện tại</th>
            <th style={{ padding: "12px" }}>Mức tối thiểu</th>
            <th style={{ padding: "12px" }}>Trạng thái cảnh báo</th>
          </tr>
        </thead>
        <tbody>
          {partsList.map((p) => (
            <tr key={p.code} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px" }}>{p.code}</td>
              <td style={{ padding: "12px" }}>{p.name}</td>
              <td style={{ padding: "12px" }}>
                {p.stock} {p.unit}
              </td>
              <td style={{ padding: "12px" }}>
                {p.minStock} {p.unit}
              </td>
              <td style={{ padding: "12px" }}>
                {p.stock <= p.minStock ? (
                  <span style={{ color: "red", fontWeight: "bold" }}>
                    ⚠️ Dưới định mức (Cần nhập kho)
                  </span>
                ) : (
                  <span style={{ color: "green" }}>Đủ tồn kho</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
