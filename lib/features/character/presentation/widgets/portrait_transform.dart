import 'dart:math' as math;

import 'package:flutter/widgets.dart';

/// 立繪取景的座標數學（純函式，可獨立測試）。
///
/// 模型：圖片先以 cover 基準縮放（保證兩軸皆 ≥ 框），得到子圖尺寸
/// cw×ch；使用者縮放 k（1–4）與正規化中心點 (cx, cy)（0–1，視窗中心
/// 對準子圖的相對位置）決定平移。平移永遠夾在「框不露出圖外」的範圍，
/// 因此任何合法狀態圖都填滿框。
class PortraitTransform {
  /// 使用者縮放（已夾 1–4）。
  final double scale;

  /// 平移（套用於 cover 基準子圖，先 scale 後 translate 的矩陣語意）。
  final double tx;
  final double ty;

  /// cover 基準下的子圖尺寸。
  final double childWidth;
  final double childHeight;

  const PortraitTransform({
    required this.scale,
    required this.tx,
    required this.ty,
    required this.childWidth,
    required this.childHeight,
  });

  Matrix4 get matrix => Matrix4.identity()
    ..translateByDouble(tx, ty, 0, 1)
    ..scaleByDouble(scale, scale, 1, 1);
}

const kPortraitMinScale = 1.0;
const kPortraitMaxScale = 4.0;

/// 由持久化的 (userScale, centerX, centerY) 計算顯示變換。
PortraitTransform portraitTransformFor({
  required Size frame,
  required Size image,
  required double userScale,
  required double centerX,
  required double centerY,
}) {
  final s0 = math.max(frame.width / image.width, frame.height / image.height);
  final cw = image.width * s0;
  final ch = image.height * s0;
  final k = userScale.clamp(kPortraitMinScale, kPortraitMaxScale);
  var tx = frame.width / 2 - centerX.clamp(0.0, 1.0) * cw * k;
  var ty = frame.height / 2 - centerY.clamp(0.0, 1.0) * ch * k;
  // 夾住平移：框的任一邊都不可露出圖外（cw*k ≥ frame.width 恆成立）。
  tx = tx.clamp(frame.width - cw * k, 0.0);
  ty = ty.clamp(frame.height - ch * k, 0.0);
  return PortraitTransform(
    scale: k,
    tx: tx,
    ty: ty,
    childWidth: cw,
    childHeight: ch,
  );
}

/// 自 InteractiveViewer 的矩陣反解出可持久化的 (scale, centerX, centerY)。
(double scale, double centerX, double centerY) portraitNormalize({
  required Matrix4 matrix,
  required Size frame,
  required double childWidth,
  required double childHeight,
}) {
  final k = matrix.getMaxScaleOnAxis();
  final t = matrix.getTranslation();
  final cx = ((frame.width / 2 - t.x) / k) / childWidth;
  final cy = ((frame.height / 2 - t.y) / k) / childHeight;
  return (
    k.clamp(kPortraitMinScale, kPortraitMaxScale),
    cx.clamp(0.0, 1.0),
    cy.clamp(0.0, 1.0),
  );
}
