import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Box,
  Wrench,
  ClipboardList,
  Calendar,
  BarChart3,
  UserCheck,
  LogOut,
} from "lucide-react";

export default function Layout() {
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/assets", label: "Quản lý Tài sản", icon: Box },
    { path: "/parts", label: "Quản lý Phụ tùng", icon: Wrench },
    { path: "/work-orders", label: "Work Orders", icon: ClipboardList },
    { path: "/schedules", label: "Lịch bảo dưỡng", icon: Calendar },
    { path: "/reports", label: "Báo cáo", icon: BarChart3 },
    { path: "/users", label: "Quản lý Tài khoản", icon: UserCheck },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          background: "#1e293b",
          color: "#fff",
          padding: "20px 0",
          flexShrink: 0,
        }}
      >
        <div
          style={{ padding: "0 20px 20px", borderBottom: "1px solid #334155" }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", color: "#38bdf8" }}>
            Smart CMMS
          </h2>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Admin & Manager Portal
          </span>
        </div>
        <nav style={{ marginTop: "20px" }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 20px",
                  color: isActive ? "#fff" : "#94a3b8",
                  background: isActive ? "#0284c7" : "transparent",
                  textDecoration: "none",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.2s",
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Header & Breadcrumbs */}
        <header
          style={{
            height: "60px",
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#64748b" }}>
            Trang chủ /{" "}
            <strong style={{ color: "#0f172a" }}>
              {menuItems.find((m) => m.path === location.pathname)?.label ||
                "Trang chủ"}
            </strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{ fontSize: "14px", fontWeight: 500, color: "#334155" }}
            >
              SV04 - Admin
            </span>
            <Link
              to="/login"
              style={{
                color: "#ef4444",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "14px",
              }}
            >
              <LogOut size={16} /> Đăng xuất
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
