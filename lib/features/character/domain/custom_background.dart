import 'package:freezed_annotation/freezed_annotation.dart';

import 'character_creation_data.dart';

part 'custom_background.freezed.dart';
part 'custom_background.g.dart';

/// 自訂背景的起源專長候選（SRD 起源專長；法術新手依施法職業有變體）。
///
/// 字串格式與 [kBackgrounds] 的 `originFeat` 一致；homebrew 專長
/// change 時再擴充。
const kOriginFeatChoices = <String>[
  '技藝精湛',
  '野蠻打擊',
  '警覺',
  '法術新手（法師）',
  '法術新手（牧師）',
  '法術新手（德魯伊）',
];

/// 自訂起源專長的欄位上限。
const kCustomOriginFeatNameMax = 20;
const kCustomOriginFeatDescMax = 200;

/// 使用者自訂背景（homebrew）。
///
/// 儲存於 `user_backgrounds` 表（文件模式，見
/// supabase/migrations/0004_user_backgrounds.sql）。結構對齊 2024
/// 背景機制：三個互異能力值加值候選、兩個互異固定技能、一個起源
/// 專長。角色卡為建卡時快照，刪改自訂背景不影響既有角色。
@freezed
abstract class CustomBackground with _$CustomBackground {
  const CustomBackground._();

  const factory CustomBackground({
    required String id,
    required String name,
    required List<String> abilities, // 3 個能力代碼（STR/DEX/...）
    required List<String> skills, // 2 個技能中文名
    required String originFeat, // SRD 模式為 kOriginFeatChoices 之一；自訂模式為使用者填寫
    /// 起源專長是否為使用者自行定義。
    ///
    /// **模式不可由名稱推導**：使用者可能自訂一個也叫「警覺」的專長，那與
    /// 從 SRD 清單選「警覺」是兩個狀態，名稱完全相同。
    @Default(false) bool originFeatCustom,

    /// 自訂起源專長的說明；SRD 模式下不採用（說明取自內容庫）。
    @Default('') String originFeatDescription,
    @Default('') String description,
  }) = _CustomBackground;

  factory CustomBackground.fromJson(Map<String, dynamic> json) =>
      _$CustomBackgroundFromJson(json);

  /// 起源專長欄位是否合法（結構層級；不判斷平衡）。
  ///
  /// 自訂模式：名稱必填且不超過上限、說明不超過上限。**允許與 SRD 候選
  /// 同名**——模式由旗標決定，同名不影響採用哪份說明。
  /// SRD 模式：名稱須為 [kOriginFeatChoices] 之一。
  bool get originFeatValid {
    if (originFeatCustom) {
      final n = originFeat.trim();
      return n.isNotEmpty &&
          n.length <= kCustomOriginFeatNameMax &&
          originFeatDescription.length <= kCustomOriginFeatDescMax;
    }
    return kOriginFeatChoices.contains(originFeat);
  }

  /// 轉接為建角流程的 [BackgroundOption]（`en` 留空：自訂背景無英文名，
  /// 角色快照的 `backgroundEn` 因此為空字串）。
  BackgroundOption toBackgroundOption() => BackgroundOption(
    cn: name,
    en: '',
    abilities: abilities,
    skills: skills,
    originFeat: originFeat,
    originFeatCustom: originFeatCustom,
    originFeatDescription: originFeatDescription,
    description: description,
  );
}
