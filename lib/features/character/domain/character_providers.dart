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
    // watch（非 read）：雲端清單抓回後 replaceAll 時，已選角色要跟著
    // 換成雲端版本，否則會停留在選取當下的過時資料。
    final list = ref.watch(characterListProvider);
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

  /// 設定/清空角色圖 URL（上傳/移除後呼叫；經 debounce 同步推送）。
  /// 換圖時取景一併重置為預設（新圖套舊取景無意義）。
  void setPortraitUrl(String url) {
    state = state.copyWith(
      portraitUrl: url,
      portraitScale: 1.0,
      portraitCenterX: 0.5,
      portraitCenterY: 0.5,
    );
  }

  /// 儲存立繪取景（縮放 + 正規化中心點；經 debounce 同步推送）。
  void setPortraitTransform({
    required double scale,
    required double centerX,
    required double centerY,
  }) {
    state = state.copyWith(
      portraitScale: scale,
      portraitCenterX: centerX,
      portraitCenterY: centerY,
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
      resources: [for (final r in state.resources) r.name == name ? f(r) : r],
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

  /// 長休：完整恢復 — HP 全滿、法術位全滿、職業資源全滿、臨時 HP 清空、力竭 −1、
  /// 回復一半生命骰（最少 1）。
  void longRest() {
    final regain = state.level ~/ 2 < 1 ? 1 : state.level ~/ 2;
    state = state.copyWith(
      currentHp: state.maxHp,
      tempHp: 0,
      spellSlots: [for (final s in state.spellSlots) s.copyWith(used: 0)],
      resources: [for (final r in state.resources) r.copyWith(current: r.max)],
      exhaustionLevel: (state.exhaustionLevel - 1).clamp(0, 6),
      hitDiceUsed: (state.hitDiceUsed - regain).clamp(0, state.level),
    );
  }

  /// 標記花用 1 顆生命骰（剩餘 −1）。
  /// App 不擲骰、不自動改 HP；玩家自行擲 `d{faces}`+體質並用 HP +/- 調整。
  void useHitDie() {
    if (state.hitDiceRemaining <= 0) return;
    state = state.copyWith(hitDiceUsed: state.hitDiceUsed + 1);
  }

  // ── 冒險日誌 ──

  void addJournalEntry(String title, String body) {
    final now = DateTime.now();
    state = state.copyWith(
      journalEntries: [
        ...state.journalEntries,
        JournalEntry(
          id: now.microsecondsSinceEpoch.toString(),
          title: title,
          body: body,
          createdAt: now,
          updatedAt: now,
        ),
      ],
    );
  }

  void updateJournalEntry(String id, String title, String body) {
    state = state.copyWith(
      journalEntries: [
        for (final e in state.journalEntries)
          e.id == id
              ? e.copyWith(title: title, body: body, updatedAt: DateTime.now())
              : e,
      ],
    );
  }

  void removeJournalEntry(String id) {
    state = state.copyWith(
      journalEntries: state.journalEntries.where((e) => e.id != id).toList(),
    );
  }
}

final characterListProvider =
    StateNotifierProvider<CharacterListNotifier, List<Character>>((ref) {
      return CharacterListNotifier();
    });

class CharacterListNotifier extends StateNotifier<List<Character>> {
  CharacterListNotifier() : super(_seed());

  static List<Character> _seed() {
    final now = DateTime(2026, 6, 24, 21, 30);
    return [
      Character.mock().copyWith(
        journalEntries: [
          JournalEntry(
            id: 'j1',
            title: '抵達銀谷鎮',
            body: '黃昏時分抵達銀谷鎮。鎮民談論著礦坑深處傳出的怪聲，鐵匠願以折扣換取我們調查。今晚先在「醉龍旅店」落腳。',
            createdAt: now.subtract(const Duration(days: 3)),
            updatedAt: now.subtract(const Duration(days: 3)),
          ),
          JournalEntry(
            id: 'j2',
            title: '哥布林洞窟',
            body:
                '循足跡進入北側洞窟，遭遇一隊哥布林伏擊。魔法飛彈解決了弓手；洞穴深處似乎還有更大的存在。撤退前撿到一枚刻著奇異符文的戒指。',
            createdAt: now.subtract(const Duration(days: 1)),
            updatedAt: now,
          ),
        ],
      ),
      Character.mockBarbarian(),
    ];
  }

  void add(Character c) => state = [...state, c];

  void remove(String id) => state = state.where((c) => c.id != id).toList();

  /// 以雲端清單取代整份本地清單（登入後同步用）。
  void replaceAll(List<Character> list) => state = list;

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
