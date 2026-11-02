import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';

class MyReportsScreen extends StatelessWidget {
  final List<MyReport>? reports;
  final String? error;
  final Future<void> Function() onRefresh;
  const MyReportsScreen({super.key, required this.reports, required this.error, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    if (reports == null && error == null) return const Center(child: CircularProgressIndicator());
    final list = [...?reports]..sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Mes signalements', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: RM.brand900)),
        const SizedBox(height: 12),
        if (error != null) Text(error!, style: const TextStyle(color: RM.danger)),
        if (list.isEmpty && error == null)
          const Padding(
            padding: EdgeInsets.only(top: 40),
            child: Text("Aucun signalement pour l'instant.", textAlign: TextAlign.center, style: TextStyle(color: RM.muted)),
          ),
        for (final r in list) ...[_ReportCard(r), const SizedBox(height: 12)],
      ]),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final MyReport r;
  const _ReportCard(this.r);

  @override
  Widget build(BuildContext context) {
    final d = r.receivedAt;
    final when = '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} '
        '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (r.imageUrl != null)
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Image.network(Api.instance.media(r.imageUrl), fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(color: RM.brand50, child: const Icon(Icons.image_not_supported_outlined))),
          ),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(r.id, style: const TextStyle(fontSize: 12, color: RM.muted)),
              const Spacer(),
              Text(when, style: const TextStyle(fontSize: 12, color: RM.muted)),
            ]),
            const SizedBox(height: 4),
            Text(defectLabels[r.type] ?? 'Dégradation', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            if (r.location != null) ...[
              const SizedBox(height: 2),
              Row(children: [
                const Icon(Icons.place_outlined, size: 15, color: RM.muted),
                const SizedBox(width: 3),
                Expanded(child: Text(r.location!, style: const TextStyle(color: RM.muted, fontSize: 13))),
              ]),
            ],
            if (r.description != null && r.description!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('« ${r.description} »', style: const TextStyle(fontSize: 13)),
            ],
            if (r.lengthM != null && r.widthM != null) ...[
              const SizedBox(height: 6),
              Text(_size(r), style: const TextStyle(fontSize: 13, color: RM.muted)),
            ],
            const SizedBox(height: 12),
            if (r.rejection != null)
              Text('Photo non retenue : ${r.rejection}', style: const TextStyle(color: RM.danger, fontSize: 13))
            else ...[
              _Progress(r.progress),
              const SizedBox(height: 8),
              Text(r.progressLabel ?? '', style: const TextStyle(fontSize: 13, color: RM.muted)),
            ],
          ]),
        ),
      ]),
    );
  }

  static String _size(MyReport r) {
    final rough = r.measureMethod == 'citizen_estimate';
    String m(double v) => rough ? (v * 10).round() / 10 == 0 ? '< 0,1' : ((v * 10).round() / 10).toString().replaceAll('.', ',') : v.toStringAsFixed(2).replaceAll('.', ',');
    final margin = r.uncertaintyPct != null ? ' (± ${r.uncertaintyPct!.round()} %)' : '';
    final depth = r.depthCm != null ? ', ${r.depthCm!.round()} cm de profondeur' : '';
    return '${rough ? '≈ ' : ''}${m(r.lengthM!)} × ${m(r.widthM!)} m$depth$margin';
  }
}

class _Progress extends StatelessWidget {
  final String? progress;
  const _Progress(this.progress);

  @override
  Widget build(BuildContext context) {
    final at = progressSteps.indexOf(progress ?? 'verification');
    return Row(children: [
      for (var i = 0; i < progressSteps.length; i++) ...[
        Expanded(
          child: Column(children: [
            Icon(
              i < at || (i == at && progress == 'repare') ? Icons.check_circle : (i == at ? Icons.radio_button_checked : Icons.radio_button_unchecked),
              size: 20,
              color: i < at || progress == 'repare' ? RM.ok : (i == at ? RM.accent : RM.line),
            ),
            const SizedBox(height: 3),
            Text(progressLabels[progressSteps[i]]!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: i <= at ? RM.ink : RM.muted, fontWeight: i == at ? FontWeight.w600 : FontWeight.w400)),
          ]),
        ),
      ],
    ]);
  }
}
