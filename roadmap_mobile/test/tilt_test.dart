import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:roadmap_citoyen/camera_meta.dart';

/// Vecteur « haut » reconstruit comme le fait le service de vision (roadvision/camera.py).
List<double> up(double beta, double gamma) {
  final b = beta * math.pi / 180, g = gamma * math.pi / 180;
  return [-math.cos(b) * math.sin(g), math.sin(b), math.cos(b) * math.cos(g)];
}

void main() {
  test('téléphone vertical : beta 90', () {
    final t = tiltFromGravity(0, 9.81, 0)!;
    expect(t.beta, closeTo(90, 0.1));
  });
  test('téléphone à plat, écran vers le ciel : beta 0, gamma 0', () {
    final t = tiltFromGravity(0, 0, 9.81)!;
    expect(t.beta, closeTo(0, 0.1));
    expect(t.gamma, closeTo(0, 0.1));
  });
  test('toute inclinaison est retrouvée par la formule du service de vision', () {
    for (final g in [
      [0.0, 6.9, 6.9], [1.5, 7.5, 6.0], [-2.0, 8.0, -5.0], [3.0, 9.0, 0.5], [-1.0, 4.0, -8.8],
    ]) {
      final t = tiltFromGravity(g[0], g[1], g[2])!;
      final n = math.sqrt(g[0] * g[0] + g[1] * g[1] + g[2] * g[2]);
      final u = up(t.beta, t.gamma);
      for (var i = 0; i < 3; i++) {
        expect(u[i], closeTo(g[i] / n, 1e-6));
      }
    }
  });
  test('secousse : pas de mesure', () => expect(tiltFromGravity(0.5, 1, 0.5), isNull));
}
