import 'package:flutter/material.dart';

import 'api.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'theme.dart';

/// Road Map — application citoyenne : signaler une dégradation de la chaussée ou d'un trottoir et suivre sa
/// réparation. Parle à la même API que la plateforme web (roadmap_api).
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.instance.load();
  runApp(const RoadMapApp());
}

class RoadMapApp extends StatelessWidget {
  const RoadMapApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Road Map',
      debugShowCheckedModeBanner: false,
      theme: RM.theme(),
      home: Api.instance.signedIn ? const HomeScreen() : const LoginScreen(),
    );
  }
}
