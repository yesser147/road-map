import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';

import '../api.dart';
import '../camera_meta.dart';
import '../models.dart';
import '../theme.dart';

enum RStep { photo, position, details, sending, done }

/// Parcours de signalement : photo -> position -> détails -> envoi (même logique que l'espace citoyen web).
class ReportFlow extends StatefulWidget {
  const ReportFlow({super.key});

  @override
  State<ReportFlow> createState() => _ReportFlowState();
}

class _ReportFlowState extends State<ReportFlow> {
  static const bizerte = LatLng(37.2744, 9.8739);
  RStep step = RStep.photo;
  Uint8List? jpeg;
  CameraMeta camera = CameraMeta();
  LatLng? pos;
  String gps = 'idle'; // idle | locating | ok | unavailable
  double? accuracy;
  String? type;
  final comment = TextEditingController();
  String? error;
  MyReport? result;
  final tilt = TiltTracker();
  final map = MapController();

  @override
  void dispose() {
    tilt.stop();
    super.dispose();
  }

  Future<void> pick(ImageSource source) async {
    setState(() => error = null);
    if (source == ImageSource.camera) tilt.start();
    final XFile? f;
    try {
      f = await ImagePicker().pickImage(source: source, requestFullMetadata: true);
    } catch (_) {
      setState(() => error = "Impossible d'ouvrir l'appareil photo ou la galerie.");
      return;
    }
    final t = source == ImageSource.camera ? tilt.current() : null; // inclinaison au moment de la photo
    tilt.stop();
    if (f == null) return;
    final original = await f.readAsBytes();
    final focal = await readFocal(original); // AVANT la compression, qui efface l'EXIF
    final small = await FlutterImageCompress.compressWithList(original,
        minWidth: 1600, minHeight: 1600, quality: 85, autoCorrectionAngle: true, keepExif: false);
    setState(() {
      jpeg = small;
      camera = CameraMeta(
        focal35: focal.focal35,
        focalMm: focal.focalMm,
        tiltBeta: t?.beta,
        tiltGamma: t?.gamma,
        capture: source == ImageSource.camera ? 'camera' : 'gallery',
      );
      step = RStep.position;
    });
    locate();
  }

  Future<void> locate() async {
    setState(() => gps = 'locating');
    try {
      if (!await Geolocator.isLocationServiceEnabled()) throw Exception();
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) throw Exception();
      final p = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 20)));
      if (!mounted) return;
      setState(() {
        pos = LatLng(p.latitude, p.longitude);
        accuracy = p.accuracy;
        gps = 'ok';
      });
      map.move(pos!, 18);
    } catch (_) {
      if (mounted) setState(() => gps = 'unavailable');
    }
  }

  Future<void> send() async {
    if (jpeg == null || pos == null) return;
    setState(() {
      step = RStep.sending;
      error = null;
    });
    try {
      final r = await Api.instance.submitReport(
          jpeg: jpeg!, lat: pos!.latitude, lng: pos!.longitude, type: type, description: comment.text, camera: camera);
      setState(() {
        result = r;
        step = RStep.done;
      });
    } on ApiError catch (e) {
      setState(() {
        error = e.message;
        step = RStep.details;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: step != RStep.sending,
      child: Scaffold(
        appBar: AppBar(title: const Text('Signaler une dégradation')),
        body: SafeArea(child: switch (step) {
          RStep.photo => _photo(),
          RStep.position => _position(),
          RStep.details || RStep.sending => _details(),
          RStep.done => _done(),
        }),
      ),
    );
  }

  Widget _steps(int at) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
        child: Row(children: [
          for (final (i, s) in ['Photo', 'Emplacement', 'Détails'].indexed) ...[
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(height: 4, decoration: BoxDecoration(color: i <= at ? RM.brand : RM.line, borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 4),
                Text('${i + 1}. $s', style: TextStyle(fontSize: 12, color: i <= at ? RM.brand : RM.muted, fontWeight: i == at ? FontWeight.w600 : FontWeight.w400)),
              ]),
            ),
            if (i < 2) const SizedBox(width: 6),
          ],
        ]),
      );

  Widget _photo() => ListView(children: [
        _steps(0),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Photographiez la dégradation', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: RM.brand900)),
            const SizedBox(height: 6),
            const Text('Cadrez le défaut en entier, de jour si possible, debout, téléphone incliné vers le sol.',
                style: TextStyle(color: RM.muted)),
            const SizedBox(height: 18),
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => pick(ImageSource.camera),
              child: Container(
                height: 180,
                decoration: BoxDecoration(
                  color: RM.brand50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: RM.brand.withValues(alpha: .4), width: 1.5),
                ),
                child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.photo_camera_outlined, size: 44, color: RM.brand),
                  SizedBox(height: 8),
                  Text('Prendre une photo', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: RM.brand)),
                  Text("Ouvre l'appareil photo", style: TextStyle(color: RM.muted, fontSize: 13)),
                ]),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
                onPressed: () => pick(ImageSource.gallery), icon: const Icon(Icons.photo_library_outlined), label: const Text('Choisir dans la galerie')),
            if (error != null) ...[const SizedBox(height: 12), Text(error!, style: const TextStyle(color: RM.danger))],
          ]),
        ),
      ]);

  Widget _position() => Column(children: [
        _steps(1),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
          child: Row(children: [
            if (jpeg != null)
              ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(jpeg!, width: 56, height: 56, fit: BoxFit.cover)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Où se trouve-t-elle ?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: RM.brand900)),
                Text(
                  switch (gps) {
                    'locating' => 'Recherche de votre position…',
                    'ok' => 'Position GPS trouvée (± ${accuracy?.round() ?? '?'} m). Touchez la carte pour ajuster.',
                    _ => 'Position indisponible : touchez la carte à l\'endroit du défaut.',
                  },
                  style: TextStyle(fontSize: 13, color: gps == 'ok' ? RM.ok : RM.muted),
                ),
              ]),
            ),
          ]),
        ),
        Expanded(
          child: FlutterMap(
            mapController: map,
            options: MapOptions(
              initialCenter: pos ?? bizerte,
              initialZoom: pos == null ? 14 : 18,
              onTap: (_, p) => setState(() => pos = p),
            ),
            children: [
              TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'tn.roadmap.citoyen'),
              if (pos != null)
                MarkerLayer(markers: [
                  Marker(point: pos!, width: 44, height: 44, alignment: Alignment.topCenter,
                      child: const Icon(Icons.location_on, size: 44, color: RM.danger)),
                ]),
              const SimpleAttributionWidget(source: Text('© OpenStreetMap')),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(
              child: OutlinedButton.icon(onPressed: gps == 'locating' ? null : locate, icon: const Icon(Icons.my_location), label: const Text('Ma position')),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: FilledButton(onPressed: pos == null ? null : () => setState(() => step = RStep.details), child: const Text('Continuer')),
            ),
          ]),
        ),
      ]);

  Widget _details() => ListView(children: [
        _steps(2),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text("De quoi s'agit-il ?", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: RM.brand900)),
            const Text('Facultatif — la photo est aussi analysée automatiquement.', style: TextStyle(fontSize: 13, color: RM.muted)),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final e in defectChoices.entries)
                ChoiceChip(
                  label: Text(e.value),
                  selected: type == e.key,
                  labelStyle: TextStyle(color: type == e.key ? Colors.white : RM.ink),
                  showCheckmark: false,
                  onSelected: (s) => setState(() => type = s ? e.key : null),
                ),
            ]),
            if (camera.capture == 'camera') ...[
              const SizedBox(height: 18),
              const Text('Photo prise', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'standing', label: Text('Debout'), icon: Icon(Icons.accessibility_new)),
                  ButtonSegment(value: 'crouching', label: Text('Accroupi(e)'), icon: Icon(Icons.airline_seat_legroom_reduced)),
                ],
                selected: {camera.posture},
                onSelectionChanged: (s) => setState(() => camera.posture = s.first),
              ),
              const SizedBox(height: 4),
              const Text('Sert à estimer la taille du défaut.', style: TextStyle(fontSize: 12, color: RM.muted)),
            ],
            const SizedBox(height: 18),
            TextField(
              controller: comment,
              maxLines: 3,
              maxLength: 1000,
              decoration: const InputDecoration(labelText: 'Commentaire (facultatif)', hintText: "Ex. : devant l'école, dangereux pour les deux-roues"),
            ),
            if (error != null) ...[Text(error!, style: const TextStyle(color: RM.danger)), const SizedBox(height: 10)],
            FilledButton.icon(
              onPressed: step == RStep.sending ? null : send,
              icon: step == RStep.sending
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send),
              label: Text(step == RStep.sending ? 'Envoi et analyse…' : 'Envoyer le signalement'),
            ),
          ]),
        ),
      ]);

  Widget _done() {
    final r = result!;
    final rejected = r.rejection != null;
    return ListView(padding: const EdgeInsets.all(24), children: [
      const SizedBox(height: 20),
      Icon(rejected ? Icons.error_outline : Icons.check_circle_outline, size: 72, color: rejected ? RM.danger : RM.ok),
      const SizedBox(height: 12),
      Text(rejected ? 'Photo non retenue' : 'Merci, signalement reçu',
          textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      Text(
        rejected ? r.rejection! : 'Référence ${r.id}. Les services vont le vérifier ; vous pouvez suivre son avancement.',
        textAlign: TextAlign.center,
        style: const TextStyle(color: RM.muted),
      ),
      if (!rejected && r.type != null) ...[
        const SizedBox(height: 16),
        Card(
          child: ListTile(
            leading: const Icon(Icons.auto_awesome, color: RM.brand),
            title: Text(defectLabels[r.type] ?? r.type!),
            subtitle: const Text('Détecté sur la photo'),
          ),
        ),
      ],
      const SizedBox(height: 24),
      if (rejected)
        FilledButton.icon(
          onPressed: () => setState(() {
            step = RStep.photo;
            jpeg = null;
            result = null;
          }),
          icon: const Icon(Icons.photo_camera),
          label: const Text('Reprendre une photo'),
        )
      else
        FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Suivre mes signalements')),
    ]);
  }
}
