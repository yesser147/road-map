import 'package:flutter_test/flutter_test.dart';
import 'package:roadmap_citoyen/main.dart';

void main() {
  testWidgets('écran de connexion au premier lancement', (tester) async {
    await tester.pumpWidget(const RoadMapApp());
    expect(find.text('Se connecter'), findsWidgets);
  });
}
