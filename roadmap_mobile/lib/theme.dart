import 'package:flutter/material.dart';

/// Identité « Méditerranée » de la plateforme web : bleu Road Map, terre cuite, fond sable.
class RM {
  static const brand = Color(0xFF1B5FA8);
  static const brand900 = Color(0xFF0F2748);
  static const brand50 = Color(0xFFEDF4FC);
  static const accent = Color(0xFFD2612E);
  static const sand = Color(0xFFF5F3EE);
  static const ink = Color(0xFF1C2433);
  static const muted = Color(0xFF5B6577);
  static const line = Color(0xFFE2DED4);
  static const ok = Color(0xFF2E9E6B);
  static const danger = Color(0xFFD2352C);

  static ThemeData theme() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: brand, primary: brand, secondary: accent, surface: Colors.white),
      scaffoldBackgroundColor: sand,
    );
    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: brand900,
        foregroundColor: Colors.white,
        elevation: 0,
        titleTextStyle: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Colors.white),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: brand,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          side: const BorderSide(color: line),
          foregroundColor: ink,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: line)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: line)),
      ),
      chipTheme: base.chipTheme.copyWith(
        selectedColor: brand,
        labelStyle: const TextStyle(fontSize: 14),
        side: const BorderSide(color: line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }
}
