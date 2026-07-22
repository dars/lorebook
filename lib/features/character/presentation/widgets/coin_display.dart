import 'package:flutter/material.dart';

import '../../domain/currency_math.dart';

/// 幣別圖示資產（與財富卡同一組，裁自 designs/images/coin.PNG）。
const kCoinAssets = {
  'pp': 'assets/images/coins/coin_pp.png',
  'gp': 'assets/images/coins/coin_gp.png',
  'ep': 'assets/images/coins/coin_ep.png',
  'sp': 'assets/images/coins/coin_sp.png',
  'cp': 'assets/images/coins/coin_cp.png',
};

class CoinIcon extends StatelessWidget {
  final String code; // pp/gp/ep/sp/cp
  final double size;
  const CoinIcon(this.code, {super.key, this.size = 16});

  @override
  Widget build(BuildContext context) {
    final asset = kCoinAssets[code];
    if (asset == null) return const SizedBox.shrink();
    return Image.asset(
      asset,
      width: size,
      height: size,
      filterQuality: FilterQuality.medium,
    );
  }
}

/// 以「圖示＋數字」呈現 cp 總額（拆為 pp/gp/sp/cp，不產生 ep），
/// 取代純文字的 formatCp 顯示。
class CoinAmount extends StatelessWidget {
  final int cp;
  final double coinSize;
  final TextStyle? style;
  const CoinAmount(this.cp, {super.key, this.coinSize = 16, this.style});

  @override
  Widget build(BuildContext context) {
    var rest = cp;
    final parts = <(String, int)>[];
    for (final (code, value) in [
      ('pp', kCpPerPp),
      ('gp', kCpPerGp),
      ('sp', kCpPerSp),
      ('cp', 1),
    ]) {
      final n = rest ~/ value;
      rest %= value;
      if (n > 0) parts.add((code, n));
    }
    if (parts.isEmpty) parts.add(('cp', 0));

    final textStyle =
        style ??
        const TextStyle(
          fontFamily: 'Cinzel',
          fontSize: 14,
          fontWeight: FontWeight.w700,
        );
    // 順序：數字在前、幣別圖示在後（如「5🥇 3🥈」）。
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < parts.length; i++) ...[
          if (i > 0) const SizedBox(width: 6),
          Text('${parts[i].$2}', style: textStyle),
          const SizedBox(width: 2),
          CoinIcon(parts[i].$1, size: coinSize),
        ],
      ],
    );
  }
}
