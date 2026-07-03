import 'package:flutter/material.dart';

import '../../../app/theme/app_colors.dart';
import '../../../features/character/domain/character.dart';

/// 角色頭像：有角色圖顯示圖（載入失敗回退字首），無圖顯示姓氏字首。
/// 各顯示點（頁首、角色選擇卡、確認頁）共用，樣式參數化。
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
    final initial = Center(
      child: Text(
        character.name.isEmpty ? '?' : character.name.characters.first,
        style:
            initialStyle ??
            TextStyle(
              fontFamily: 'Cinzel',
              fontSize: size * 0.45,
              fontWeight: FontWeight.w700,
              color: AppColors.darkTextPrimary,
            ),
      ),
    );

    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: background ?? AppColors.darkSurface1,
        border: borderColor == null
            ? null
            : Border.all(color: borderColor!, width: borderWidth),
      ),
      child: character.portraitUrl.isEmpty
          ? initial
          : Image.network(
              character.portraitUrl,
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => initial,
            ),
    );
  }
}
