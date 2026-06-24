import 'package:flutter/material.dart';

abstract final class AppTextStyles {
  static const _cinzel = 'Cinzel';
  static const _sourceSans = 'SourceSans3';

  // ──────────────────────────────────────────
  // Headings — Cinzel
  // ──────────────────────────────────────────
  static const h1 = TextStyle(
    fontFamily: _cinzel,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.5,
  );

  static const h2 = TextStyle(
    fontFamily: _cinzel,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.3,
  );

  // ──────────────────────────────────────────
  // Body — Source Sans 3
  // ──────────────────────────────────────────
  static const body1 = TextStyle(
    fontFamily: _sourceSans,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.2,
  );

  static const body2 = TextStyle(
    fontFamily: _sourceSans,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.2,
  );

  static const caption = TextStyle(
    fontFamily: _sourceSans,
    fontSize: 11,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.2,
  );

  // ──────────────────────────────────────────
  // Specialized
  // ──────────────────────────────────────────
  static const statLarge = TextStyle(
    fontFamily: _sourceSans,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    letterSpacing: 0,
  );

  static const statMedium = TextStyle(
    fontFamily: _sourceSans,
    fontSize: 24,
    fontWeight: FontWeight.w700,
    letterSpacing: 0,
  );

  static const levelBadge = TextStyle(
    fontFamily: _cinzel,
    fontSize: 36,
    fontWeight: FontWeight.w700,
    letterSpacing: 0,
  );

  static const sectionLabel = TextStyle(
    fontFamily: _sourceSans,
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.2,
  );
}
