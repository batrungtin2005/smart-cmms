import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f5f9",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          background: "#fff",
          padding: "32px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          width: "360px",
        }}
      >
        <h2 style={{ marginTop: 0, textAlign: "center", color: "#0284c7" }}>
          Smart CMMS
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "14px",
            marginBottom: "24px",
          }}
        >
          Đăng nhập hệ thống Quản trị
        </p>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "14px",
              color: "#334155",
            }}
          >
            Email / Tên đăng nhập
          </label>
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
              boxSizing: "border-box",
            }}
            placeholder="admin@smartcmms.com"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "14px",
              color: "#334155",
            }}
          >
            Mật khẩu
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
              boxSizing: "border-box",
            }}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "#0284c7",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Đăng nhập
        </button>
      </form>
    </div>
  );
}
