import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'character.dart';

/// 當前角色的可變狀態。提供 HP / 臨時 HP / 異常狀態 / 力竭 / 專注 的編輯動作。
///
/// 本階段以 mock 角色運作；之後接雲端時，於各方法內改呼叫 repository 即可，
/// UI 層（`ref.watch(currentCharacterProvider)`）不需變動。
final currentCharacterProvider =
    NotifierProvider<CurrentCharacterNotifier, Character>(
  CurrentCharacterNotifier.new,
);

class CurrentCharacterNotifier extends Notifier<Character> {
  @override
  Character build() => Character.mock();

  /// 調整 HP：delta<0 為傷害（先扣臨時 HP 再扣當前 HP）；delta>0 為治療（只補當前 HP）。
  void adjustHp(int delta) {
    if (delta < 0) {
      var damage = -delta;
      var temp = state.tempHp;
      if (temp > 0) {
        final absorbed = temp >= damage ? damage : temp;
        temp -= absorbed;
        damage -= absorbed;
      }
      final newHp = (state.currentHp - damage).clamp(0, state.maxHp);
      state = state.copyWith(currentHp: newHp, tempHp: temp);
    } else {
      final newHp = (state.currentHp + delta).clamp(0, state.maxHp);
      state = state.copyWith(currentHp: newHp);
    }
  }

  /// 設定臨時 HP（取代，不與既有值相加）。
  void setTempHp(int value) {
    state = state.copyWith(tempHp: value < 0 ? 0 : value);
  }

  /// 清空臨時 HP（長休時呼叫）。
  void clearTempHp() => state = state.copyWith(tempHp: 0);

  void addCondition(String name) {
    if (state.conditions.contains(name)) return;
    state = state.copyWith(conditions: [...state.conditions, name]);
  }

  void removeCondition(String name) {
    state = state.copyWith(
      conditions: state.conditions.where((c) => c != name).toList(),
    );
  }

  /// 調整力竭等級（夾在 0~6，0 視為無）。
  void adjustExhaustion(int delta) {
    state = state.copyWith(
      exhaustionLevel: (state.exhaustionLevel + delta).clamp(0, 6),
    );
  }

  void startConcentration(String name) {
    state = state.copyWith(concentrationSpell: name);
  }

  void endConcentration() {
    state = state.copyWith(concentrationSpell: null);
  }
}

final characterListProvider =
    StateNotifierProvider<CharacterListNotifier, List<Character>>((ref) {
  return CharacterListNotifier();
});

class CharacterListNotifier extends StateNotifier<List<Character>> {
  CharacterListNotifier() : super([Character.mock()]);

  void add(Character c) => state = [...state, c];

  void remove(String id) => state = state.where((c) => c.id != id).toList();
}
