import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../../../app/theme/dnd_colors.dart';
import '../../../../app/theme/surface_colors.dart';
import '../../domain/character.dart';
import '../../domain/character_providers.dart';
import '../widgets/spell_entry.dart';

class InventoryTab extends StatelessWidget {
  final Character character;

  const InventoryTab({super.key, required this.character});

  @override
  Widget build(BuildContext context) {
    final dnd = Theme.of(context).extension<DndColors>()!;

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        context.bottomNavClearance,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CollapsibleSection(
            title: 'TREASURY 財富',
            child: _Treasury(currency: character.currency),
          ),
          CollapsibleSection(
            title: 'EQUIPMENT 裝備',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (character.weapons.isNotEmpty) ...[
                  const _SubLabel(icon: Icons.gavel, text: '武器 WEAPONS'),
                  const SizedBox(height: AppSpacing.sm),
                  for (final w in character.weapons)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: weaponEntryCard(w, dnd: dnd),
                    ),
                  const SizedBox(height: AppSpacing.md),
                ],
                const _SubLabel(icon: Icons.backpack_outlined, text: '裝備 GEAR'),
                const SizedBox(height: AppSpacing.sm),
                ...character.equipment.map((e) => _EquipmentRow(item: e)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 五種幣別的視覺／文字規格；財富卡與計算機共用同一份定義，避免顏色/順序分岔。
class _CoinSpec {
  final String code; // PP/GP/EP/SP/CP
  final String label; // 中文簡稱
  final Color highlight;
  final Color base;
  final Color shadow;
  final int Function(Currency) read;

  const _CoinSpec({
    required this.code,
    required this.label,
    required this.highlight,
    required this.base,
    required this.shadow,
    required this.read,
  });
}

const _coinSpecs = [
  _CoinSpec(
    code: 'PP',
    label: '鉑金',
    highlight: Color(0xFFF5F5FA),
    base: Color(0xFFD8D8E0),
    shadow: Color(0xFF9A9AA8),
    read: _readPp,
  ),
  _CoinSpec(
    code: 'GP',
    label: '金幣',
    highlight: Color(0xFFF6DD8C),
    base: Color(0xFFD4AF37),
    shadow: Color(0xFF8B6E2A),
    read: _readGp,
  ),
  _CoinSpec(
    code: 'EP',
    label: '琥珀金',
    highlight: Color(0xFFE0D19C),
    base: Color(0xFFB9A96B),
    shadow: Color(0xFF7C6E40),
    read: _readEp,
  ),
  _CoinSpec(
    code: 'SP',
    label: '銀幣',
    highlight: Color(0xFFEDEFF3),
    base: Color(0xFFB8BCC2),
    shadow: Color(0xFF74787F),
    read: _readSp,
  ),
  _CoinSpec(
    code: 'CP',
    label: '銅幣',
    highlight: Color(0xFFE3A874),
    base: Color(0xFFB87333),
    shadow: Color(0xFF6E4419),
    read: _readCp,
  ),
];

int _readPp(Currency c) => c.pp;
int _readGp(Currency c) => c.gp;
int _readEp(Currency c) => c.ep;
int _readSp(Currency c) => c.sp;
int _readCp(Currency c) => c.cp;

class _Treasury extends StatelessWidget {
  final Currency currency;
  const _Treasury({required this.currency});

  @override
  Widget build(BuildContext context) {
    return ParchmentCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        onTap: () => _showCurrencyCalculator(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
          child: Row(
            children: [
              for (final spec in _coinSpecs)
                Expanded(
                  child: _Coin(spec: spec, amount: spec.read(currency)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Coin extends StatelessWidget {
  final _CoinSpec spec;
  final int amount;
  const _Coin({required this.spec, required this.amount});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 32,
          height: 32,
          child: CustomPaint(painter: _CoinPainter(spec)),
        ),
        const SizedBox(height: 6),
        Text(
          '$amount',
          style: TextStyle(
            fontFamily: 'Cinzel',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: theme.colorScheme.onSurface,
          ),
        ),
        Text(
          spec.code,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 10,
            letterSpacing: 1,
            color: AppColors.sectionLabel,
          ),
        ),
      ],
    );
  }
}

/// 立體硬幣：斜射高光 + 金屬漸層 + 壓花緣圈，質感依幣別（鉑/金/琥珀/銀/銅）區分。
class _CoinPainter extends CustomPainter {
  final _CoinSpec spec;
  const _CoinPainter(this.spec);

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2;

    // 投影
    canvas.drawCircle(
      center.translate(0, 1.2),
      radius,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.35)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
    );

    // 幣面漸層
    final facePaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.4),
        radius: 0.9,
        colors: [spec.highlight, spec.base, spec.shadow],
        stops: const [0.0, 0.55, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, facePaint);

    // 邊緣描邊
    canvas.drawCircle(
      center,
      radius - 0.75,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = spec.shadow.withValues(alpha: 0.9),
    );

    // 內緣壓花圈（模擬鑄幣滾邊）
    canvas.drawCircle(
      center,
      radius * 0.72,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = spec.shadow.withValues(alpha: 0.55),
    );
  }

  @override
  bool shouldRepaint(covariant _CoinPainter oldDelegate) =>
      oldDelegate.spec.code != spec.code;
}

// ─────────────────────────────────────────── 財富計算機
//
// 操作順序：按 +/- 選符號 → 按數字輸入金額 → 按幣別完成一筆，數字接著繼續打
// 下一筆（如「1金10銅」：輸入 1、點金、輸入 10、點銅）→ 按確定一次套用全部
// 增減量。幣別由小到大排列（銅/銀/琥珀/金/鉑），且每一筆選的幣別須比上一筆
// 更小（例：可「3金10銀」，不可「10銀3金」），符合由大到小唱數的直覺。
const _ascendingCurrencyCodes = ['CP', 'SP', 'EP', 'GP', 'PP'];

int _currencyRank(String code) => _ascendingCurrencyCodes.indexOf(code);

void _showCurrencyCalculator(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: Theme.of(context).extension<SurfaceColors>()!.surface1,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => const _CurrencyCalculatorSheet(),
  );
}

class _CurrencyTerm {
  final String sign; // '+' | '-'
  final int amount;
  final String code; // spec.code
  const _CurrencyTerm({
    required this.sign,
    required this.amount,
    required this.code,
  });

  int get signedAmount => sign == '-' ? -amount : amount;
}

class _CurrencyCalculatorSheet extends ConsumerStatefulWidget {
  const _CurrencyCalculatorSheet();

  @override
  ConsumerState<_CurrencyCalculatorSheet> createState() =>
      _CurrencyCalculatorSheetState();
}

class _CurrencyCalculatorSheetState
    extends ConsumerState<_CurrencyCalculatorSheet> {
  final _terms = <_CurrencyTerm>[];
  String _sign = '+';
  String _digits = '';

  void _tapDigit(String d) {
    if (_digits.length >= 6) return;
    setState(() => _digits += d);
  }

  void _tapSign(String s) => setState(() => _sign = s);

  void _tapBackspace() {
    setState(() {
      if (_digits.isNotEmpty) {
        _digits = _digits.substring(0, _digits.length - 1);
      } else if (_terms.isNotEmpty) {
        _terms.removeLast();
      }
    });
  }

  void _tapClear() => setState(() {
    _digits = '';
    _sign = '+';
    _terms.clear();
  });

  /// 目前允許點選的最大幣別 rank（null＝尚未選過，全部可點）；
  /// 由最後一筆已完成的紀錄推得，刪除紀錄後會自動放寬。
  int? get _maxAllowedRank =>
      _terms.isEmpty ? null : _currencyRank(_terms.last.code);

  bool _currencyEnabled(String code) =>
      _digits.isNotEmpty &&
      (_maxAllowedRank == null || _currencyRank(code) < _maxAllowedRank!);

  void _tapCurrency(String code) {
    if (!_currencyEnabled(code)) return;
    final amount = int.parse(_digits);
    setState(() {
      if (amount != 0) {
        _terms.add(_CurrencyTerm(sign: _sign, amount: amount, code: code));
      }
      // 數字歸零、符號沿用，讓「1金10銅」這種連續輸入不必重按 +/-。
      _digits = '';
    });
  }

  void _removeTerm(int index) => setState(() => _terms.removeAt(index));

  void _confirm() {
    if (_terms.isNotEmpty) {
      final deltas = {for (final s in _coinSpecs) s.code: 0};
      for (final t in _terms) {
        deltas[t.code] = deltas[t.code]! + t.signedAmount;
      }
      ref
          .read(currentCharacterProvider.notifier)
          .adjustCurrency(
            pp: deltas['PP']!,
            gp: deltas['GP']!,
            ep: deltas['EP']!,
            sp: deltas['SP']!,
            cp: deltas['CP']!,
          );
    }
    Navigator.pop(context);
  }

  /// 符號只在「最前面」或跟上一筆不同（正負變化）時才顯示，同號的連續筆數
  /// 不重複標符號，如「+10金3銀」而非「+10金+3銀」。
  bool _showSignAt(int index) =>
      index == 0 || _terms[index].sign != _terms[index - 1].sign;

  bool get _showPendingSign => _terms.isEmpty || _sign != _terms.last.sign;

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final specByCode = {for (final s in _coinSpecs) s.code: s};
    final pendingText = _digits.isEmpty
        ? ''
        : (_showPendingSign ? '$_sign$_digits' : _digits);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '財富計算機',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: surfaces.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '按 +/- 選符號、輸入金額，點幣別完成一筆後可直接接著輸入下一筆；'
              '幣別需由大到小依序點選。',
              style: TextStyle(
                fontFamily: 'NotoSerifTC',
                fontSize: 11,
                color: surfaces.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // 顯示幕：同一列由左到右累加——已完成的筆數與正在輸入的數字都留在
            // 同一行（不會被收到上面另一區），確定套用後才會一次收掉並計算。
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: surfaces.surface0,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: surfaces.border2),
              ),
              child: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 10,
                runSpacing: 6,
                children: [
                  for (var i = 0; i < _terms.length; i++)
                    _InlineTerm(
                      term: _terms[i],
                      spec: specByCode[_terms[i].code]!,
                      showSign: _showSignAt(i),
                      onRemove: () => _removeTerm(i),
                    ),
                  if (pendingText.isNotEmpty)
                    Text(
                      pendingText,
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: _sign == '-'
                            ? AppColors.danger
                            : AppColors.success,
                      ),
                    )
                  else if (_terms.isEmpty)
                    Text(
                      '0',
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: surfaces.textSecondary,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // 幣別選擇列（由小到大：銅/銀/琥珀/金/鉑）：完成目前輸入的這一筆。
            Row(
              children: [
                for (final code in _ascendingCurrencyCodes)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: _CurrencyPickButton(
                        spec: specByCode[code]!,
                        enabled: _currencyEnabled(code),
                        onTap: () => _tapCurrency(code),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // 鍵盤：數字 + 僅保留 +/-（無其他科學符號）。
            _CalcKeypad(
              onDigit: _tapDigit,
              onSign: _tapSign,
              onBackspace: _tapBackspace,
              onClear: _tapClear,
            ),
            const SizedBox(height: AppSpacing.md),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: surfaces.border),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: Text(
                      '取消',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        color: surfaces.textSecondary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: FilledButton(
                    onPressed: _confirm,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.accentGold,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: Text(
                      _terms.isEmpty ? '關閉' : '確定套用',
                      style: const TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1206),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 已完成的一筆，以「數字 + 幣別小圖」接續在同一行顯示幕上（非獨立浮動的
/// chip，也不是文字幣別名稱）；點一下可從序列中移除這一筆。
class _InlineTerm extends StatelessWidget {
  final _CurrencyTerm term;
  final _CoinSpec spec;
  final bool showSign;
  final VoidCallback onRemove;
  const _InlineTerm({
    required this.term,
    required this.spec,
    required this.showSign,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final positive = term.sign != '-';
    final color = positive ? AppColors.success : AppColors.danger;
    return GestureDetector(
      onTap: onRemove,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            showSign ? '${term.sign}${term.amount}' : '${term.amount}',
            style: TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: color,
              decoration: TextDecoration.underline,
              decorationColor: color.withValues(alpha: 0.4),
              decorationStyle: TextDecorationStyle.dotted,
            ),
          ),
          const SizedBox(width: 3),
          SizedBox(
            width: 18,
            height: 18,
            child: CustomPaint(painter: _CoinPainter(spec)),
          ),
        ],
      ),
    );
  }
}

class _CurrencyPickButton extends StatelessWidget {
  final _CoinSpec spec;
  final bool enabled;
  final VoidCallback onTap;
  const _CurrencyPickButton({
    required this.spec,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: surfaces.surface0,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: surfaces.border),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CustomPaint(painter: _CoinPainter(spec)),
              ),
              const SizedBox(height: 4),
              Text(
                spec.label,
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: surfaces.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 標準數字鍵盤排列，操作符只留 +/-（無科學計算符號）。
class _CalcKeypad extends StatelessWidget {
  final void Function(String digit) onDigit;
  final void Function(String sign) onSign;
  final VoidCallback onBackspace;
  final VoidCallback onClear;

  const _CalcKeypad({
    required this.onDigit,
    required this.onSign,
    required this.onBackspace,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    Widget key(
      String label, {
      VoidCallback? onTap,
      Color? color,
      IconData? icon,
      int flex = 1,
    }) {
      return Expanded(
        flex: flex,
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: _KeyButton(
            label: label,
            icon: icon,
            onTap: onTap,
            color: color,
          ),
        ),
      );
    }

    return Column(
      children: [
        Row(
          children: [
            key('1', onTap: () => onDigit('1')),
            key('2', onTap: () => onDigit('2')),
            key('3', onTap: () => onDigit('3')),
            key(
              '+',
              icon: Icons.add,
              onTap: () => onSign('+'),
              color: AppColors.success,
            ),
          ],
        ),
        Row(
          children: [
            key('4', onTap: () => onDigit('4')),
            key('5', onTap: () => onDigit('5')),
            key('6', onTap: () => onDigit('6')),
            key(
              '-',
              icon: Icons.remove,
              onTap: () => onSign('-'),
              color: AppColors.danger,
            ),
          ],
        ),
        Row(
          children: [
            key('7', onTap: () => onDigit('7')),
            key('8', onTap: () => onDigit('8')),
            key('9', onTap: () => onDigit('9')),
            key('⌫', icon: Icons.backspace_outlined, onTap: onBackspace),
          ],
        ),
        Row(
          children: [
            key('C', onTap: onClear, flex: 2),
            key('0', onTap: () => onDigit('0'), flex: 2),
          ],
        ),
      ],
    );
  }
}

class _KeyButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  final Color? color;
  const _KeyButton({required this.label, this.icon, this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    final surfaces = Theme.of(context).extension<SurfaceColors>()!;
    final tint = color ?? surfaces.textPrimary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: surfaces.surface0,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: surfaces.border),
        ),
        child: icon != null
            ? Icon(icon, size: 26, color: tint)
            : Text(
                label,
                style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: tint,
                ),
              ),
      ),
    );
  }
}

class _SubLabel extends StatelessWidget {
  final IconData icon;
  final String text;
  const _SubLabel({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.sectionLabel),
        const SizedBox(width: 6),
        Text(
          text,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            color: AppColors.sectionLabel,
          ),
        ),
      ],
    );
  }
}

class _EquipmentRow extends StatelessWidget {
  final Equipment item;
  const _EquipmentRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ParchmentCard(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Row(
          children: [
            Icon(
              Icons.inventory_2_outlined,
              size: 18,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: item.name,
                          style: TextStyle(
                            fontFamily: 'NotoSerifTC',
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        TextSpan(
                          text: '  ${item.nameEn}',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 11,
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.45,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (item.description.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.description,
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 11,
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.5,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (item.equipped)
              const Icon(Icons.check, size: 16, color: AppColors.success),
          ],
        ),
      ),
    );
  }
}
