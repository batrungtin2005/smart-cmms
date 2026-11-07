export default function Users() {
  const usersList = [
    {
      id: "USR-01",
      name: "Nguyễn Hoàng Bảo",
      role: "Admin / Frontend Dev",
      email: "bao.nh@smartcmms.com",
      status: "Hoạt động",
    },
    {
      id: "USR-02",
      name: "Trần Văn Kỹ Thuật",
      role: "Technician",
      email: "tech01@smartcmms.com",
      status: "Hoạt động",
    },
    {
      id: "USR-03",
      name: "Lê Quản Lý",
      role: "Manager",
      email: "manager@smartcmms.com",
      status: "Tạm khóa",
    },
  ];

  return (
    <div>
      <h2 style={{ marginTop: 0, color: "#0f172a" }}>
        Quản lý Tài khoản & Phân quyền
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
          marginTop: "16px",
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
            <th style={{ padding: "12px 16px" }}>Mã NV</th>
            <th style={{ padding: "12px 16px" }}>Họ và tên</th>
            <th style={{ padding: "12px 16px" }}>Vai trò (Role)</th>
            <th style={{ padding: "12px 16px" }}>Email</th>
            <th style={{ padding: "12px 16px" }}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {usersList.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "12px 16px", fontWeight: 500 }}>{u.id}</td>
              <td style={{ padding: "12px 16px" }}>{u.name}</td>
              <td style={{ padding: "12px 16px" }}>{u.role}</td>
              <td style={{ padding: "12px 16px", color: "#64748b" }}>
                {u.email}
              </td>
              <td style={{ padding: "12px 16px" }}>
                <span
                  style={{
                    color: u.status === "Hoạt động" ? "#16a34a" : "#dc2626",
                    fontWeight: "bold",
                  }}
                >
                  {u.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
