import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../features/character/domain/character_providers.dart';

class StatusSection extends ConsumerWidget {
  const StatusSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final character = ref.watch(currentCharacterProvider);
    final hpRatio = character.currentHp / character.maxHp;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(title: 'STATUS 狀態'),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // HP
              Expanded(
                child: _HpCard(
                  current: character.currentHp,
                  max: character.maxHp,
                  ratio: hpRatio,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              // AC
              _AcShield(value: character.ac),
              const SizedBox(width: AppSpacing.sm),
              // Concentration
              Expanded(
                child: _ConcentrationCard(
                  spell: character.concentrationSpell,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        _ConditionsRow(conditions: character.conditions),
      ],
    );
  }
}

class _HpCard extends StatelessWidget {
  final int current;
  final int max;
  final double ratio;
  const _HpCard({required this.current, required this.max, required this.ratio});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm + 2,
        ),
        child: Column(
          children: [
            Row(
              children: [
                Icon(Icons.favorite, size: 12, color: AppColors.danger),
                const SizedBox(width: 4),
                Text('HP', style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accentGold,
                )),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  '$current',
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkTextPrimary,
                  ),
                ),
                Text(
                  '/$max',
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 14,
                    color: AppColors.darkTextSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: SizedBox(
                height: 5,
                child: Row(
                  children: [
                    Expanded(
                      flex: (ratio * 100).round(),
                      child: Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [AppColors.danger, AppColors.hpMid],
                          ),
                        ),
                      ),
                    ),
                    if (ratio < 1.0)
                      Expanded(
                        flex: ((1 - ratio) * 100).round(),
                        child: Container(color: AppColors.hpBarBg),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _HpButton(icon: Icons.remove, onPressed: () {}),
                const SizedBox(width: 8),
                _HpButton(icon: Icons.add, onPressed: () {}),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AcShield extends StatelessWidget {
  final int value;
  const _AcShield({required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 100,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.shield_outlined, size: 14,
                  color: const Color(0xFFC8A86B)),
              const SizedBox(width: 4),
              Text('AC', style: TextStyle(
                fontFamily: 'Cinzel',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.5,
                color: const Color(0xFFC8A86B),
              )),
            ],
          ),
          const SizedBox(height: 4),
          SizedBox(
            width: 84,
            height: 90,
            child: CustomPaint(
              painter: _ShieldPainter(),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: ShaderMask(
                    shaderCallback: (bounds) => const LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [Color(0xFFF0D080), Color(0xFFC8963C)],
                    ).createShader(bounds),
                    child: Text(
                      '$value',
                      style: const TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 36,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '無甲・敏捷',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 11,
              letterSpacing: 0.5,
              color: const Color(0xFFA08050),
            ),
          ),
        ],
      ),
    );
  }
}

class _ShieldPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 140;
    final sy = size.height / 150;

    final outerPath = Path()
      ..moveTo(70 * sx, 0)
      ..lineTo(140 * sx, 28 * sy)
      ..lineTo(140 * sx, 90 * sy)
      ..cubicTo(140 * sx, 128 * sy, 70 * sx, 150 * sy, 70 * sx, 150 * sy)
      ..cubicTo(70 * sx, 150 * sy, 0, 128 * sy, 0, 90 * sy)
      ..lineTo(0, 28 * sy)
      ..close();

    // Drop shadow
    canvas.drawPath(
      outerPath.shift(const Offset(0, 2)),
      Paint()
        ..color = const Color(0x88000000)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );

    // Fill gradient (#3A2E1E → #1E1710)
    final fillPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF3A2E1E), Color(0xFF1E1710)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawPath(outerPath, fillPaint);

    // Gradient stroke (#D4A843 → #8B6820 → #D4A843)
    final strokePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2 * sx
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFFD4A843), Color(0xFF8B6820), Color(0xFFD4A843)],
        stops: [0.0, 0.5, 1.0],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawPath(outerPath, strokePaint);

    // Inner shield outline
    final isx = (size.width - 12 * sx) / 120;
    final isy = (size.height - 12 * sy) / 128;
    final ox = 6 * sx;
    final oy = 6 * sy;
    final innerPath = Path()
      ..moveTo(ox + 60 * isx, oy)
      ..lineTo(ox + 120 * isx, oy + 24 * isy)
      ..lineTo(ox + 120 * isx, oy + 76 * isy)
      ..cubicTo(
        ox + 120 * isx, oy + 109 * isy,
        ox + 60 * isx, oy + 128 * isy,
        ox + 60 * isx, oy + 128 * isy,
      )
      ..cubicTo(
        ox + 60 * isx, oy + 128 * isy,
        ox, oy + 109 * isy,
        ox, oy + 76 * isy,
      )
      ..lineTo(ox, oy + 24 * isy)
      ..close();

    canvas.drawPath(
      innerPath,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8
        ..color = const Color(0x998B6820),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ConcentrationCard extends StatelessWidget {
  final String? spell;
  const _ConcentrationCard({this.spell});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm + 2,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.auto_fix_high, size: 12,
                    color: AppColors.accentGold),
                const SizedBox(width: 4),
                Text('專注', style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkTextSecondary,
                )),
              ],
            ),
            const Spacer(),
            if (spell != null) ...[
              Text(
                spell!,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.darkTextPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Blur・專注',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 9,
                  color: AppColors.darkTextSecondary,
                ),
              ),
              const Spacer(),
              Container(
                width: double.infinity,
                height: 22,
                decoration: BoxDecoration(
                  color: AppColors.darkBorder,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Center(
                  child: Text(
                    '點按結束',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 9,
                      color: AppColors.darkTextSecondary,
                    ),
                  ),
                ),
              ),
            ] else
              Expanded(
                child: Center(
                  child: Text('無',
                    style: TextStyle(
                      fontFamily: 'NotoSerifTC',
                      fontSize: 14,
                      color: AppColors.darkTextSecondary.withValues(alpha: 0.5),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ConditionsRow extends StatelessWidget {
  final List<String> conditions;
  const _ConditionsRow({required this.conditions});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.darkSurface2,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.darkBorder2, width: 1),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, size: 10,
              color: AppColors.sectionLabel),
          const SizedBox(width: 6),
          Text('狀態異常・CONDITIONS',
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 10,
              color: AppColors.goldDim,
            ),
          ),
          const Spacer(),
          Text(
            conditions.isEmpty ? '目前無異常狀態' : conditions.join(', '),
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 10,
              color: AppColors.darkTextSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _HpButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  const _HpButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(4),
      child: Container(
        width: 28,
        height: 24,
        decoration: BoxDecoration(
          color: AppColors.darkBorder,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Icon(icon, size: 14, color: AppColors.darkTextPrimary),
      ),
    );
  }
}
