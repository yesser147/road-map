import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'camera_meta.dart';
import 'models.dart';

/// Client de l'API Road Map (roadmap_api, Spring Boot). L'adresse du serveur se règle dans l'application :
/// en développement, c'est l'adresse Wi-Fi du PC qui fait tourner le backend (port 8080).
class Api {
  Api._();
  static final Api instance = Api._();

  static const defaultServer = 'http://192.168.1.168:8080';
  String server = defaultServer;
  String? _token;
  User? user;

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    server = p.getString('server') ?? defaultServer;
    _token = p.getString('token');
    final u = p.getString('user');
    if (u != null) user = User.fromJson(jsonDecode(u));
  }

  bool get signedIn => _token != null && user != null;

  Future<void> setServer(String url) async {
    server = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (!server.startsWith('http')) server = 'http://$server';
    (await SharedPreferences.getInstance()).setString('server', server);
  }

  String media(String? path) => path == null ? '' : (path.startsWith('http') ? path : '$server$path');

  Map<String, String> get _auth => _token == null ? {} : {'Authorization': 'Bearer $_token'};

  Future<void> login(String email, String password) => _session(
      '/api/v1/auth/login', {'email': email.trim(), 'password': password, 'space': 'citoyen'});

  Future<void> register(String fullName, String email, String? phone, String password) => _session(
      '/api/v1/auth/register',
      {'fullName': fullName.trim(), 'email': email.trim(), 'phone': (phone ?? '').trim().isEmpty ? null : phone!.trim(), 'password': password});

  Future<void> _session(String path, Map<String, dynamic> body) async {
    final r = await _send(() => http.post(Uri.parse('$server$path'),
        headers: {'Content-Type': 'application/json'}, body: jsonEncode(body)));
    final j = jsonDecode(utf8.decode(r.bodyBytes)) as Map<String, dynamic>;
    _token = j['token'];
    user = User.fromJson(j['user']);
    final p = await SharedPreferences.getInstance();
    await p.setString('token', _token!);
    await p.setString('user', jsonEncode({'id': user!.id, 'name': user!.name, 'email': user!.email, 'role': user!.role}));
  }

  Future<void> logout() async {
    _token = null;
    user = null;
    final p = await SharedPreferences.getInstance();
    await p.remove('token');
    await p.remove('user');
  }

  Future<List<MyReport>> myReports() async {
    final r = await _send(() => http.get(Uri.parse('$server/api/v1/citizen/reports'), headers: _auth));
    final list = jsonDecode(utf8.decode(r.bodyBytes)) as List;
    return list.map((e) => MyReport.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Envoi d'un signalement : photo réduite + position + infos de prise de vue (focale, inclinaison, posture),
  /// qui permettent au service de vision d'estimer la taille du défaut en centimètres.
  Future<MyReport> submitReport({
    required Uint8List jpeg,
    required double lat,
    required double lng,
    String? type,
    String? description,
    required CameraMeta camera,
  }) async {
    final req = http.MultipartRequest('POST', Uri.parse('$server/api/v1/citizen/reports'))
      ..headers.addAll(_auth)
      ..fields['lat'] = '$lat'
      ..fields['lng'] = '$lng'
      ..fields.addAll(camera.toFields())
      ..files.add(http.MultipartFile.fromBytes('photo', jpeg, filename: 'signalement.jpg', contentType: _jpeg));
    if (type != null) req.fields['type'] = type;
    if (description != null && description.trim().isNotEmpty) req.fields['description'] = description.trim();
    final r = await _send(() async => http.Response.fromStream(await req.send().timeout(const Duration(seconds: 60))));
    final j = jsonDecode(utf8.decode(r.bodyBytes)) as Map<String, dynamic>;
    return MyReport.fromJson({'report': j});
  }

  static final _jpeg = MediaType('image', 'jpeg');

  Future<http.Response> _send(Future<http.Response> Function() call) async {
    http.Response r;
    try {
      r = await call().timeout(const Duration(seconds: 60));
    } catch (_) {
      throw ApiError('Connexion au serveur impossible ($server). Vérifiez le Wi-Fi et l\'adresse du serveur.');
    }
    if (r.statusCode == 401) {
      await logout();
      throw ApiError('Session expirée, reconnectez-vous.', unauthorized: true);
    }
    if (r.statusCode >= 400) {
      String msg = 'Erreur ${r.statusCode}';
      try {
        final j = jsonDecode(utf8.decode(r.bodyBytes));
        msg = (j['detail'] ?? j['title'] ?? msg).toString();
      } catch (_) {}
      throw ApiError(msg);
    }
    return r;
  }
}

class ApiError implements Exception {
  final String message;
  final bool unauthorized;
  ApiError(this.message, {this.unauthorized = false});
  @override
  String toString() => message;
}
