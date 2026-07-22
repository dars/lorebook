import 'package:flutter/material.dart';

import '../../../app/theme/surface_colors.dart';
import '../../../features/character/domain/character.dart';

/// 角色頭像：有角色圖顯示圖；無圖或載入失敗顯示「未知人像」佔位圖
/// （assets/images/unknown.jpg，黑霧金瞳）。各顯示點共用，樣式參數化。
class CharacterAvatar extends StatelessWidget {
  final Character character;
  final double size;
  final Color? borderColor;
  final double borderWidth;
  final Color? background;
  final TextStyle? initialStyle;

  const CharacterAvatar({
    super.key,
    required this.character,
    required this.size,
    this.borderColor,
    this.borderWidth = 0,
    this.background,
    this.initialStyle,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final placeholder = Image.asset(
      'assets/images/unknown.jpg',
      width: size,
      height: size,
      fit: BoxFit.cover,
      // 圖高於寬，取上緣偏中（眼睛落在圓框內）
      alignment: const Alignment(0, -0.4),
      filterQuality: FilterQuality.medium,
    );

    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: background ?? surfaces.surface1,
        border: borderColor == null
            ? null
            : Border.all(color: borderColor!, width: borderWidth),
      ),
      child: character.portraitUrl.isEmpty
          ? placeholder
          : Image.network(
              character.portraitUrl,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => placeholder,
            ),
    );
  }
}
