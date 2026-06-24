import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/character_providers.dart';
import 'tabs/abilities_tab.dart';
import 'tabs/biography_tab.dart';
import 'tabs/inventory_tab.dart';
import 'tabs/overview_tab.dart';
import 'tabs/spells_tab.dart';
import 'widgets/character_tab_bar.dart';

class CharacterPage extends ConsumerStatefulWidget {
  const CharacterPage({super.key});

  @override
  ConsumerState<CharacterPage> createState() => _CharacterPageState();
}

class _CharacterPageState extends ConsumerState<CharacterPage> {
  static const _tabs = ['總覽', '屬性', '法術', '物品', '傳記'];
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final character = ref.watch(currentCharacterProvider);

    final tab = switch (_index) {
      0 => OverviewTab(character: character),
      1 => AbilitiesTab(character: character),
      2 => SpellsTab(character: character),
      3 => InventoryTab(character: character),
      _ => BiographyTab(character: character),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CharacterTabBar(
          tabs: _tabs,
          currentIndex: _index,
          onChanged: (i) => setState(() => _index = i),
        ),
        Expanded(child: tab),
      ],
    );
  }
}
