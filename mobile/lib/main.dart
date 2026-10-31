import 'package:flutter/material.dart';

void main() {
  runApp(const SmartCmmsApp());
}

class SmartCmmsApp extends StatelessWidget {
  const SmartCmmsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart CMMS - Kỹ Thuật Viên',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
        useMaterial3: true,
      ),
      home: const TechnicianHomePage(),
    );
  }
}

class TechnicianHomePage extends StatelessWidget {
  const TechnicianHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart CMMS - Kỹ Thuật Viên'),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.build_circle_outlined, size: 80, color: Color(0xFF2563EB)),
              const SizedBox(height: 16),
              const Text(
                'Ứng Dụng Kỹ Thuật Viên Hiện Trường',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Hỗ trợ Quét QR, Nhận việc & Đồng bộ Offline-First khi mất mạng.',
                style: TextStyle(color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: const [
                      ListTile(
                        leading: Icon(Icons.qr_code_scanner, color: Colors.blue),
                        title: Text('Quét mã QR thiết bị'),
                        subtitle: Text('Tra cứu nhanh AST-xxx tại hiện trường'),
                      ),
                      Divider(),
                      ListTile(
                        leading: Icon(Icons.assignment, color: Colors.orange),
                        title: Text('Phiếu công việc được giao'),
                        subtitle: Text('Cập nhật trạng thái và phụ tùng sử dụng'),
                      ),
                      Divider(),
                      ListTile(
                        leading: Icon(Icons.sync, color: Colors.green),
                        title: Text('Hàng đợi đồng bộ Offline (SQLite)'),
                        subtitle: Text('Tự động đẩy dữ liệu khi có mạng trở lại'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
