import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import 'login_screen.dart';
import 'my_reports_screen.dart';
import 'report_flow.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int tab = 0;
  List<MyReport>? reports;
  String? error;

  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    try {
      final r = await Api.instance.myReports();
      if (mounted) {
        setState(() {
          reports = r;
          error = null;
        });
      }
    } on ApiError catch (e) {
      if (e.unauthorized) return _toLogin();
      if (mounted) setState(() => error = e.message);
    }
  }

  void _toLogin() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
  }

  Future<void> report() async {
    final sent = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => const ReportFlow()));
    if (sent == true) {
      await refresh();
      if (mounted) setState(() => tab = 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Api.instance.user;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const Row(children: [
          Icon(Icons.add_road, color: RM.accent),
          SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Road Map'),
            Text('Espace citoyen', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: Colors.white70)),
          ]),
        ]),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.account_circle_outlined),
            onSelected: (v) async {
              if (v == 'settings') {
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen()));
              } else {
                await Api.instance.logout();
                _toLogin();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(enabled: false, child: Text(user?.name ?? '')),
              const PopupMenuItem(value: 'settings', child: Text('Réglages')),
              const PopupMenuItem(value: 'logout', child: Text('Se déconnecter')),
            ],
          ),
        ],
      ),
      body: tab == 0 ? _home(user) : MyReportsScreen(reports: reports, error: error, onRefresh: refresh),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab == 0 ? 0 : 2,
        onDestinationSelected: (i) {
          if (i == 1) {
            report();
          } else {
            setState(() => tab = i == 0 ? 0 : 1);
            if (i == 2) refresh();
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.photo_camera, color: RM.accent), label: 'Signaler'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Mes signalements'),
        ],
      ),
    );
  }

  Widget _home(User? user) {
    final r = reports ?? [];
    final sent = r.length, current = r.where((x) => x.inProgress).length, fixed = r.where((x) => x.repaired).length;
    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        Text('Bonjour ${user?.name.split(' ').first ?? ''}',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: RM.brand900)),
        const SizedBox(height: 4),
        const Text("Merci de contribuer à l'entretien des routes de votre quartier.", style: TextStyle(color: RM.muted)),
        const SizedBox(height: 16),
        Material(
          color: RM.brand,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: report,
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(color: RM.accent, borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.photo_camera, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Signaler une dégradation',
                        style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700)),
                    SizedBox(height: 3),
                    Text("Nid-de-poule, plaque d'égout, trottoir cassé… une photo suffit.",
                        style: TextStyle(color: Colors.white70, fontSize: 13)),
                  ]),
                ),
                const Icon(Icons.chevron_right, color: Colors.white),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          _stat('$sent', 'envoyés', RM.ink),
          const SizedBox(width: 10),
          _stat('$current', 'en cours', RM.accent),
          const SizedBox(width: 10),
          _stat('$fixed', 'réparés', RM.ok),
        ]),
        const SizedBox(height: 12),
        if (error != null)
          Card(child: Padding(padding: const EdgeInsets.all(14), child: Text(error!, style: const TextStyle(color: RM.danger)))),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [Icon(Icons.lightbulb_outline, size: 18, color: RM.accent), SizedBox(width: 6), Text('Une bonne photo', style: TextStyle(fontWeight: FontWeight.w600))]),
              SizedBox(height: 8),
              Text('• Cadrez le défaut en entier, à 1-2 mètres.\n'
                  '• Prenez la photo debout, téléphone incliné vers le sol : la taille du défaut est estimée plus précisément.\n'
                  "• Restez en sécurité : ne vous arrêtez jamais sur la chaussée.\n"
                  '• Évitez les personnes et les plaques (elles sont floutées de toute façon).',
                  style: TextStyle(color: RM.muted, height: 1.45)),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _stat(String v, String label, Color c) => Expanded(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Column(children: [
              Text(v, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: c)),
              Text(label, style: const TextStyle(fontSize: 12, color: RM.muted)),
            ]),
          ),
        ),
      );
}
