import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../api.dart';
import '../theme.dart';

/// Adresse du serveur Road Map : en test, l'adresse Wi-Fi du PC qui fait tourner le backend (port 8080).
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final url = TextEditingController(text: Api.instance.server);
  String? status;
  bool ok = false, testing = false;

  Future<void> test() async {
    setState(() {
      testing = true;
      status = null;
    });
    await Api.instance.setServer(url.text);
    url.text = Api.instance.server;
    try {
      final r = await http.get(Uri.parse('${Api.instance.server}/actuator/health')).timeout(const Duration(seconds: 6));
      ok = r.statusCode < 500;
      status = ok ? 'Serveur joignable.' : 'Le serveur répond avec une erreur (${r.statusCode}).';
    } catch (_) {
      ok = false;
      status = 'Serveur injoignable : même réseau Wi-Fi ? backend démarré ? pare-feu Windows ?';
    }
    if (mounted) setState(() => testing = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Réglages')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        const Text('Adresse du serveur', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: url,
          keyboardType: TextInputType.url,
          decoration: const InputDecoration(hintText: 'http://192.168.1.168:8080'),
        ),
        const SizedBox(height: 8),
        const Text("En test : l'adresse IPv4 Wi-Fi du PC (commande ipconfig), port 8080.",
            style: TextStyle(fontSize: 13, color: RM.muted)),
        const SizedBox(height: 16),
        FilledButton(onPressed: testing ? null : test, child: Text(testing ? 'Test…' : 'Enregistrer et tester')),
        if (status != null) ...[
          const SizedBox(height: 12),
          Text(status!, style: TextStyle(color: ok ? RM.ok : RM.danger)),
        ],
      ]),
    );
  }
}
