/// Types de défauts proposés au citoyen (mêmes codes que l'API et l'application web).
const defectChoices = <String, String>{
  'nid_de_poule': 'Nid-de-poule',
  'fissure_longitudinale': 'Fissure',
  'affaissement': 'Affaissement',
  'plaque_egout_defectueuse': "Plaque d'égout",
  'dalle_cassee': 'Trottoir cassé',
  'bordure_cassee': 'Bordure cassée',
  'soulevement_racine': "Racine d'arbre",
};

const defectLabels = <String, String>{
  ...defectChoices,
  'fissure_transversale': 'Fissure',
  'faiencage': 'Faïençage',
  'ressaut': 'Ressaut',
};

/// Étapes vues par le citoyen (ReportService.progress côté API).
const progressSteps = ['verification', 'pris_en_charge', 'travaux', 'repare'];
const progressLabels = {
  'verification': 'Vérification',
  'pris_en_charge': 'Pris en charge',
  'travaux': 'Travaux',
  'repare': 'Réparé',
};

class User {
  final String id, name, email, role;
  User(this.id, this.name, this.email, this.role);
  factory User.fromJson(Map<String, dynamic> j) =>
      User('${j['id']}', j['name'] ?? '', j['email'] ?? '', j['role'] ?? '');
}

class MyReport {
  final String id;
  final DateTime receivedAt;
  final String? imageUrl, description, type, location, state, progress, progressLabel, rejection;
  final double? lengthM, widthM, depthCm, uncertaintyPct;
  final String? measureMethod;

  MyReport({
    required this.id,
    required this.receivedAt,
    this.imageUrl,
    this.description,
    this.type,
    this.location,
    this.state,
    this.progress,
    this.progressLabel,
    this.rejection,
    this.lengthM,
    this.widthM,
    this.depthCm,
    this.uncertaintyPct,
    this.measureMethod,
  });

  factory MyReport.fromJson(Map<String, dynamic> j) {
    final r = (j['report'] ?? {}) as Map<String, dynamic>;
    final x = (r['extraction'] ?? {}) as Map<String, dynamic>;
    final pc = (r['photoCheck'] ?? {}) as Map<String, dynamic>;
    double? n(dynamic v) => v == null ? null : (v as num).toDouble();
    return MyReport(
      id: '${r['id']}',
      receivedAt: DateTime.tryParse('${r['receivedAt']}')?.toLocal() ?? DateTime.now(),
      imageUrl: r['imageUrl'],
      description: r['description'],
      type: x['type'],
      location: x['location'],
      state: r['state'],
      progress: j['progress'],
      progressLabel: j['progressLabel'],
      rejection: pc['accepted'] == false ? pc['reason'] as String? : null,
      lengthM: n(x['lengthM']),
      widthM: n(x['widthM']),
      depthCm: n(x['depthCm']),
      uncertaintyPct: n(x['uncertaintyPct']),
      measureMethod: x['measureMethod'],
    );
  }

  bool get repaired => progress == 'repare';
  bool get inProgress => !repaired && progress != 'non_retenu' && state != 'rejete';
}
