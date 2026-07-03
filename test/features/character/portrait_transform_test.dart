import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/character/presentation/widgets/portrait_transform.dart';

void main() {
  // 框 400×320、直向圖 800×1600 → cover 基準 s0 = 0.5，子圖 400×800。
  const frame = Size(400, 320);
  const image = Size(800, 1600);

  group('portraitTransformFor', () {
    test('預設取景（scale 1、中心 0.5）置中且填滿', () {
      final t = portraitTransformFor(
        frame: frame,
        image: image,
        userScale: 1,
        centerX: 0.5,
        centerY: 0.5,
      );
      expect(t.childWidth, 400);
      expect(t.childHeight, 800);
      expect(t.tx, 0); // 寬度剛好 → 無水平位移空間
      expect(t.ty, 320 / 2 - 0.5 * 800); // -240，垂直置中
      // 框不露出圖外
      expect(t.tx <= 0 && t.tx >= frame.width - t.childWidth * t.scale, isTrue);
      expect(
        t.ty <= 0 && t.ty >= frame.height - t.childHeight * t.scale,
        isTrue,
      );
    });

    test('中心點極端值被夾住，框永不露出圖外', () {
      for (final cy in [0.0, 1.0, -5.0, 9.0]) {
        final t = portraitTransformFor(
          frame: frame,
          image: image,
          userScale: 1,
          centerX: 0.5,
          centerY: cy,
        );
        expect(t.ty <= 0, isTrue, reason: 'cy=$cy 上緣');
        expect(
          t.ty >= frame.height - t.childHeight * t.scale,
          isTrue,
          reason: 'cy=$cy 下緣',
        );
      }
    });

    test('縮放夾在 1–4', () {
      expect(
        portraitTransformFor(
          frame: frame,
          image: image,
          userScale: 0.2,
          centerX: 0.5,
          centerY: 0.5,
        ).scale,
        1,
      );
      expect(
        portraitTransformFor(
          frame: frame,
          image: image,
          userScale: 99,
          centerX: 0.5,
          centerY: 0.5,
        ).scale,
        4,
      );
    });
  });

  test('normalize 與 transform 互為往返', () {
    final t = portraitTransformFor(
      frame: frame,
      image: image,
      userScale: 2,
      centerX: 0.4,
      centerY: 0.7,
    );
    final (scale, cx, cy) = portraitNormalize(
      matrix: t.matrix,
      frame: frame,
      childWidth: t.childWidth,
      childHeight: t.childHeight,
    );
    expect(scale, closeTo(2, 1e-9));
    expect(cx, closeTo(0.4, 1e-9));
    expect(cy, closeTo(0.7, 1e-9));
  });
}
