import React from 'react';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: '#0f172a',
        color: '#ffffff',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>⚙️ SMART CMMS</span>
          <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>| ZENTECH COMPANY (DT05)</span>
        </div>
        <div style={{ fontSize: '0.875rem', background: '#1e293b', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
          Vai trò: <strong style={{ color: '#38bdf8' }}>Admin / Quản lý</strong>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Hệ Thống Quản Lý Vận Hành & Bảo Trì Thiết Bị
          </h1>
          <p style={{ color: '#64748b' }}>
            Khung giao diện Web Quản trị đã sẵn sàng kết nối API Backend (NestJS). SV04 bắt đầu phát triển các màn hình tại thư mục <code>src/pages/</code>.
          </p>
        </div>

        {/* Quick KPI Cards Preview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tổng số thiết bị kỹ thuật</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>300</div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>✓ Đã sẵn sàng seed dữ liệu</div>
          </div>

          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Chỉ số MTTR (Giờ sửa chữa TB)</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>2.4h</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Xu hướng: Giảm dần (Tốt)</div>
          </div>

          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Chỉ số MTBF (Giờ giữa 2 lần hỏng)</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>350h</div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>Xu hướng: Tăng dần (Bền bỉ)</div>
          </div>

          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Work Orders cần xử lý</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>12</div>
            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>2 phiếu khẩn cấp</div>
          </div>
        </div>

        {/* Navigation Quick Links */}
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Điều hướng phân hệ chức năng (SV04 triển khai):
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <li style={{ padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.875rem' }}>
              📊 <strong>Dashboard & KPI</strong> (<code>src/pages/Dashboard</code>)
            </li>
            <li style={{ padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.875rem' }}>
              🏭 <strong>Quản lý Thiết bị & QR</strong> (<code>src/pages/Assets</code>)
            </li>
            <li style={{ padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.875rem' }}>
              📋 <strong>Phiếu Work Order Kanban</strong> (<code>src/pages/WorkOrders</code>)
            </li>
            <li style={{ padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.875rem' }}>
              📅 <strong>Lịch bảo dưỡng định kỳ 3 kiểu</strong> (<code>src/pages/Schedules</code>)
            </li>
            <li style={{ padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.875rem' }}>
              📦 <strong>Phụ tùng & Kho vật tư</strong> (<code>src/pages/Parts</code>)
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
