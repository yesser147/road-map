import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:exif/exif.dart';
import 'package:sensors_plus/sensors_plus.dart';

/// Ce que le téléphone sait de la prise de vue, envoyé avec la photo (mêmes champs que l'application web) :
///  - focale équivalente 24x36 lue dans l'EXIF du fichier ORIGINAL (la compression efface l'EXIF) ;
///  - inclinaison du téléphone au moment de la photo, convertie dans la convention W3C (beta, gamma)
///    attendue par le service de vision (roadvision/camera.py) ;
///  - posture (debout / accroupi), qui donne la hauteur du téléphone au-dessus de la route.
class CameraMeta {
  double? focal35, focalMm, tiltBeta, tiltGamma;
  String capture; // camera | gallery
  String posture; // standing | crouching

  CameraMeta({this.focal35, this.focalMm, this.tiltBeta, this.tiltGamma, this.capture = 'gallery', this.posture = 'standing'});

  Map<String, String> toFields() => {
        if (focal35 != null) 'focal35': focal35!.toStringAsFixed(0),
        if (focalMm != null) 'focalMm': focalMm!.toStringAsFixed(2),
        if (tiltBeta != null) 'tiltBeta': tiltBeta!.toStringAsFixed(1),
        if (tiltGamma != null) 'tiltGamma': tiltGamma!.toStringAsFixed(1),
        'capture': capture,
        if (capture == 'camera') 'posture': posture,
      };
}

/// Focale lue dans l'EXIF (tags FocalLengthIn35mmFilm et FocalLength).
Future<({double? focal35, double? focalMm})> readFocal(Uint8List original) async {
  try {
    final tags = await readExifFromBytes(original);
    double? parse(String? s) {
      if (s == null) return null;
      final p = s.split('/');
      if (p.length == 2) {
        final d = double.tryParse(p[1]) ?? 0;
        return d == 0 ? null : (double.tryParse(p[0]) ?? 0) / d;
      }
      return double.tryParse(s);
    }

    final f35 = parse(tags['EXIF FocalLengthIn35mmFilm']?.printable);
    final f = parse(tags['EXIF FocalLength']?.printable);
    return (focal35: (f35 != null && f35 > 0) ? f35 : null, focalMm: (f != null && f > 0) ? f : null);
  } catch (_) {
    return (focal35: null, focalMm: null);
  }
}

/// Suit la gravité pendant que l'écran de prise de vue est ouvert : la dernière valeur avant le retour de
/// l'appareil photo donne l'inclinaison du téléphone au moment du déclenchement.
class TiltTracker {
  StreamSubscription<AccelerometerEvent>? _sub;
  double _x = 0, _y = 0, _z = 0;
  bool _has = false;

  void start() {
    _sub ??= accelerometerEventStream(samplingPeriod: SensorInterval.uiInterval).listen((e) {
      // filtre passe-bas : on garde la gravité, pas les tremblements de la main
      const a = 0.2;
      _x = _has ? _x + a * (e.x - _x) : e.x;
      _y = _has ? _y + a * (e.y - _y) : e.y;
      _z = _has ? _z + a * (e.z - _z) : e.z;
      _has = true;
    }, onError: (_) {});
  }

  void stop() {
    _sub?.cancel();
    _sub = null;
  }

  /// (beta, gamma) en degrés, convention DeviceOrientation W3C : le vecteur « haut » dans le repère du
  /// téléphone vaut (-cos b sin g, sin b, cos b cos g). L'accéléromètre au repos mesure ce vecteur haut.
  ({double beta, double gamma})? current() {
    if (!_has) return null;
    return tiltFromGravity(_x, _y, _z);
  }
}

/// (beta, gamma) en degrés depuis la gravité mesurée par l'accéléromètre (repère du téléphone : x droite,
/// y haut du téléphone, z sortant de l'écran ; au repos l'accéléromètre mesure le vecteur « haut »).
/// Convention DeviceOrientation W3C : haut = (-cos b sin g, sin b, cos b cos g).
({double beta, double gamma})? tiltFromGravity(double x, double y, double z) {
  final n = math.sqrt(x * x + y * y + z * z);
  if (n < 5) return null; // mouvement brusque : mesure non fiable
  final ux = x / n, uy = y / n, uz = z / n;
  final g = math.atan2(-ux, uz);
  final cb = math.cos(g).abs() > 1e-3 ? uz / math.cos(g) : -ux / math.sin(g);
  final b = math.atan2(uy, cb);
  return (beta: b * 180 / math.pi, gamma: g * 180 / math.pi);
}
