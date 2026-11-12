class AssetDetails {
  const AssetDetails({
    required this.id,
    required this.code,
    required this.name,
    required this.category,
    required this.status,
    required this.criticality,
    required this.operatingHours,
    this.manufacturer,
    this.model,
    this.serialNumber,
    this.location,
    this.factoryArea,
    this.installDate,
    this.specifications = const {},
    this.recentHistory = const [],
  });

  final String id;
  final String code;
  final String name;
  final String category;
  final String status;
  final String criticality;
  final double operatingHours;
  final String? manufacturer;
  final String? model;
  final String? serialNumber;
  final String? location;
  final String? factoryArea;
  final DateTime? installDate;
  final Map<String, Object?> specifications;
  final List<MaintenanceEntry> recentHistory;
}

class MaintenanceEntry {
  const MaintenanceEntry(
      {required this.title,
      required this.eventType,
      required this.createdAt,
      this.actionTaken,
      this.performedBy});

  final String title;
  final String eventType;
  final DateTime createdAt;
  final String? actionTaken;
  final String? performedBy;
}
