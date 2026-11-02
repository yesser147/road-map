import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';
import 'home_screen.dart';
import 'settings_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool register = false;
  bool busy = false;
  bool showPwd = false;
  bool consent = false;
  String? error;
  final name = TextEditingController(), phone = TextEditingController();
  final email = TextEditingController(), password = TextEditingController();
  final form = GlobalKey<FormState>();

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    if (register && !consent) {
      setState(() => error = "Merci d'accepter l'utilisation de vos photos pour l'entretien du réseau.");
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      if (register) {
        await Api.instance.register(name.text, email.text, phone.text, password.text);
      } else {
        await Api.instance.login(email.text, password.text);
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
    } on ApiError catch (e) {
      setState(() => error = e.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            Row(children: [
              const _Mark(),
              const SizedBox(width: 10),
              const Expanded(child: Text('Road Map', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600))),
              IconButton(
                tooltip: 'Réglages',
                icon: const Icon(Icons.settings_outlined),
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen())),
              ),
            ]),
            const SizedBox(height: 28),
            const Text('Un trou dans votre rue ?\nUne photo suffit.',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: RM.brand900, height: 1.15)),
            const SizedBox(height: 10),
            const Text('Signalez une dégradation de la chaussée ou d\'un trottoir et suivez sa réparation.',
                style: TextStyle(color: RM.muted, fontSize: 15)),
            const SizedBox(height: 22),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('Se connecter')),
                ButtonSegment(value: true, label: Text('Créer un compte')),
              ],
              selected: {register},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() {
                register = s.first;
                error = null;
              }),
            ),
            const SizedBox(height: 16),
            Form(
              key: form,
              child: Column(children: [
                if (register) ...[
                  TextFormField(
                    controller: name,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Nom et prénom'),
                    validator: (v) => (v ?? '').trim().isEmpty ? 'Indiquez votre nom' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Téléphone (facultatif)', hintText: '+216 …'),
                  ),
                  const SizedBox(height: 12),
                ],
                TextFormField(
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(labelText: 'Adresse e-mail'),
                  validator: (v) => (v ?? '').contains('@') ? null : 'Adresse e-mail invalide',
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: password,
                  obscureText: !showPwd,
                  decoration: InputDecoration(
                    labelText: register ? 'Mot de passe (8 caractères minimum)' : 'Mot de passe',
                    suffixIcon: IconButton(
                      icon: Icon(showPwd ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => showPwd = !showPwd),
                    ),
                  ),
                  validator: (v) => (v ?? '').isEmpty
                      ? 'Indiquez votre mot de passe'
                      : (register && v!.length < 8 ? '8 caractères minimum' : null),
                ),
              ]),
            ),
            if (register) ...[
              const SizedBox(height: 8),
              CheckboxListTile(
                value: consent,
                onChanged: (v) => setState(() => consent = v ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                title: const Text(
                    "J'accepte que mes photos et leur position soient utilisées pour l'entretien du réseau. "
                    'Les visages et plaques d\'immatriculation sont floutés automatiquement.',
                    style: TextStyle(fontSize: 13, color: RM.muted)),
              ),
            ],
            if (error != null) ...[
              const SizedBox(height: 8),
              Text(error!, style: const TextStyle(color: RM.danger)),
            ],
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: busy ? null : submit,
              icon: busy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Icon(register ? Icons.person_add_alt_1 : Icons.login),
              label: Text(register ? 'Créer mon compte' : 'Se connecter'),
            ),
            const SizedBox(height: 18),
            const Text('Ministère de l\'Équipement — zone pilote : Bizerte',
                textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: RM.muted)),
          ],
        ),
      ),
    );
  }
}

class _Mark extends StatelessWidget {
  const _Mark();

  @override
  Widget build(BuildContext context) => Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(color: RM.accent, borderRadius: BorderRadius.circular(9)),
        child: const Icon(Icons.add_road, color: Colors.white, size: 22),
      );
}
