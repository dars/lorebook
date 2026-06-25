import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'character.dart';

/// 當前角色的可變狀態。提供 HP / 臨時 HP / 異常狀態 / 力竭 / 專注 的編輯動作。
///
/// 本階段以 mock 角色運作；之後接雲端時，於各方法內改呼叫 repository 即可，
/// UI 層（`ref.watch(currentCharacterProvider)`）不需變動。
/// 當前選取的角色 id（null = 尚未選取）。當前角色與路由 gate 的單一來源。
final selectedCharacterIdProvider = StateProvider<String?>((ref) => null);

final currentCharacterProvider =
    NotifierProvider<CurrentCharacterNotifier, Character>(
  CurrentCharacterNotifier.new,
);

class CurrentCharacterNotifier extends Notifier<Character> {
  @override
  Character build() {
    final id = ref.watch(selectedCharacterIdProvider);
    final list = ref.read(characterListProvider);
    if (id != null) {
      for (final c in list) {
        if (c.id == id) return c;
      }
    }
    return list.isNotEmpty ? list.first : Character.mock();
  }

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

  // ── 法術位 ──

  /// 設定某環法術位的已使用數（夾在 0~total）。
  void setSlotUsed(int level, int used) {
    state = state.copyWith(
      spellSlots: [
        for (final s in state.spellSlots)
          s.level == level ? s.copyWith(used: used.clamp(0, s.total)) : s,
      ],
    );
  }

  // ── 職業資源 ──

  void _updateResource(String name, ClassResource Function(ClassResource) f) {
    state = state.copyWith(
      resources: [
        for (final r in state.resources) r.name == name ? f(r) : r,
      ],
    );
  }

  void spendResource(String name) => _updateResource(
        name,
        (r) => r.copyWith(current: (r.current - 1).clamp(0, r.max)),
      );

  void restoreResource(String name) => _updateResource(
        name,
        (r) => r.copyWith(current: (r.current + 1).clamp(0, r.max)),
      );

  void resetResource(String name) =>
      _updateResource(name, (r) => r.copyWith(current: r.max));

  /// 直接設定某資源當前值（pips 點選用；夾 0~max）。
  void setResourceCurrent(String name, int value) =>
      _updateResource(name, (r) => r.copyWith(current: value.clamp(0, r.max)));

  // ── 休息 ──

  /// 短休：回滿「短休回復」的職業資源（臨時 HP 不動）。
  void shortRest() {
    state = state.copyWith(
      resources: [
        for (final r in state.resources)
          r.recovery == ResourceRecovery.short ? r.copyWith(current: r.max) : r,
      ],
    );
  }

  /// 長休：完整恢復 — HP 全滿、法術位全滿、職業資源全滿、臨時 HP 清空、力竭 −1。
  void longRest() {
    state = state.copyWith(
      currentHp: state.maxHp,
      tempHp: 0,
      spellSlots: [for (final s in state.spellSlots) s.copyWith(used: 0)],
      resources: [for (final r in state.resources) r.copyWith(current: r.max)],
      exhaustionLevel: (state.exhaustionLevel - 1).clamp(0, 6),
    );
  }
}

final characterListProvider =
    StateNotifierProvider<CharacterListNotifier, List<Character>>((ref) {
  return CharacterListNotifier();
});

class CharacterListNotifier extends StateNotifier<List<Character>> {
  CharacterListNotifier()
      : super([Character.mock(), Character.mockBarbarian()]);

  void add(Character c) => state = [...state, c];

  void remove(String id) => state = state.where((c) => c.id != id).toList();

  /// 以 id 取代清單中該角色；不存在則新增（切換時保留編輯用）。
  void upsert(Character c) {
    final i = state.indexWhere((e) => e.id == c.id);
    if (i >= 0) {
      final copy = [...state];
      copy[i] = c;
      state = copy;
    } else {
      state = [...state, c];
    }
  }
}
