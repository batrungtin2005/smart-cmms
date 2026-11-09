export enum AssetStatus {
  OPERATIONAL = 'OPERATIONAL', // Đang hoạt động bình thường
  DOWN = 'DOWN', // Đang gặp sự cố hỏng hóc, dừng máy
  MAINTENANCE = 'MAINTENANCE', // Đang bảo trì định kỳ / bảo dưỡng
  DECOMMISSIONED = 'DECOMMISSIONED', // Ngừng hoạt động / thanh lý
}

export enum AssetCriticality {
  LOW = 'LOW', // Ít quan trọng
  MEDIUM = 'MEDIUM', // Trung bình
  HIGH = 'HIGH', // Quan trọng cao
  CRITICAL = 'CRITICAL', // Cực kỳ quan trọng (dừng là tê liệt dây chuyền)
}

