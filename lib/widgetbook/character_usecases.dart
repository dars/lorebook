import 'package:flutter/material.dart';
import 'package:widgetbook/widgetbook.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../features/character/presentation/widgets/ability_shield.dart';
import '../shared/presentation/widgets/ability_hex_chart.dart';

@widgetbook.UseCase(name: 'Default', type: AbilityShield)
Widget abilityShieldUseCase(BuildContext context) => Scaffold(
  body: Center(
    child: SizedBox(
      width: 120,
      child: AbilityShield(
        nameCn: '智力',
        nameEn: 'INT',
        modifier: context.knobs.int.slider(
          label: 'Modifier',
          initialValue: 3,
          min: -2,
          max: 6,
        ),
        score: context.knobs.int.slider(
          label: 'Score',
          initialValue: 17,
          min: 3,
          max: 20,
        ),
        highlighted: context.knobs.boolean(
          label: 'Highlighted',
          initialValue: true,
        ),
      ),
    ),
  ),
);

@widgetbook.UseCase(name: 'Default', type: AbilityHexChart)
Widget abilityHexChartUseCase(BuildContext context) => const Scaffold(
  body: Center(
    child: AbilityHexChart(values: [0.95, 0.45, 0.75, 0.25, 0.45, 0.30]),
  ),
);
