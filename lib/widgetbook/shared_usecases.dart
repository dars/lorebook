import 'package:flutter/material.dart';
import 'package:widgetbook/widgetbook.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../app/theme/decorations.dart';
import '../shared/presentation/widgets/ability_card.dart';
import '../shared/presentation/widgets/entry_card.dart';
import '../shared/presentation/widgets/gold_pips.dart';

/// 將 use-case 包進 Scaffold，套用主題的（深色）背景與正確寬度，
/// 使型錄外觀與 App 內一致（避免元件在白底畫布上顯示異常）。
Widget _pad(Widget child) => Scaffold(
  body: SafeArea(
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: child,
    ),
  ),
);

@widgetbook.UseCase(name: 'Default', type: CollapsibleSection)
Widget collapsibleSectionUseCase(BuildContext context) => _pad(
  CollapsibleSection(
    title: context.knobs.string(label: 'Title', initialValue: 'STATUS 狀態'),
    initiallyExpanded: context.knobs.boolean(
      label: 'Expanded',
      initialValue: true,
    ),
    summary: context.knobs.stringOrNull(label: 'Summary', initialValue: null),
    child: const Padding(
      padding: EdgeInsets.symmetric(vertical: 12),
      child: Text('內容區塊'),
    ),
  ),
);

@widgetbook.UseCase(name: 'Default', type: ParchmentCard)
Widget parchmentCardUseCase(BuildContext context) => _pad(
  const ParchmentCard(
    child: Padding(padding: EdgeInsets.all(16), child: Text('Parchment 卡片內容')),
  ),
);

@widgetbook.UseCase(name: 'Default', type: SectionTitle)
Widget sectionTitleUseCase(BuildContext context) => _pad(
  SectionTitle(
    title: context.knobs.string(label: 'Title', initialValue: '區段標題'),
    subtitle: context.knobs.stringOrNull(
      label: 'Subtitle',
      initialValue: 'Subtitle',
    ),
  ),
);

@widgetbook.UseCase(name: 'Weapon', type: EntryCard)
Widget entryCardWeaponUseCase(BuildContext context) => _pad(
  EntryCard(
    badge: '攻',
    title: context.knobs.string(label: 'Title', initialValue: '長棍'),
    subtitle: 'Quarterstaff',
    meta: '命中 +4',
    metaArrow: true,
    value: '1d6',
    description: '泛用武器（雙手 1d8）。',
  ),
);

@widgetbook.UseCase(name: 'Spell', type: EntryCard)
Widget entryCardSpellUseCase(BuildContext context) => _pad(
  const EntryCard(
    badge: '法',
    title: '火焰箭',
    subtitle: 'Fire Bolt',
    meta: '120 FT',
    value: '1d10',
    description: '遠程法術攻擊，命中造成 1d10 火焰傷害。',
  ),
);

@widgetbook.UseCase(name: 'Default', type: CompactStatRow)
Widget compactStatRowUseCase(BuildContext context) => _pad(
  CompactStatRow(
    labelCN: '體能',
    labelEN: 'Athletics',
    modifier: context.knobs.string(label: 'Modifier', initialValue: '+5'),
    isProficient: context.knobs.boolean(
      label: 'Proficient',
      initialValue: true,
    ),
  ),
);

@widgetbook.UseCase(name: 'Default', type: StatRow)
Widget statRowUseCase(BuildContext context) => _pad(
  const StatRow(
    labelCN: '感知',
    labelEN: 'Perception',
    modifier: '+3',
    isProficient: true,
  ),
);

@widgetbook.UseCase(name: 'Default', type: GoldPips)
Widget goldPipsUseCase(BuildContext context) => _pad(
  GoldPips(
    current: context.knobs.int.slider(
      label: 'Current',
      initialValue: 3,
      min: 0,
      max: 6,
    ),
    max: context.knobs.int.slider(
      label: 'Max',
      initialValue: 4,
      min: 1,
      max: 6,
    ),
  ),
);
