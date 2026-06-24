import 'package:flutter/material.dart';

import '../../../app/theme/app_spacing.dart';
import 'sections/status_section.dart';
import 'sections/resources_section.dart';
import 'sections/movement_section.dart';
import 'sections/action_section.dart';
import 'sections/bonus_action_section.dart';
import 'sections/reaction_section.dart';
import 'sections/checks_section.dart';
import 'sections/rest_section.dart';

class DecisionPage extends StatelessWidget {
  const DecisionPage({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: AppSpacing.pagePadding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const StatusSection(),
          const ResourcesSection(),
          const MovementSection(),
          const ActionSection(),
          const BonusActionSection(),
          const ReactionSection(),
          const ChecksSection(),
          const RestSection(),
          SizedBox(height: context.bottomNavClearance),
        ],
      ),
    );
  }
}
