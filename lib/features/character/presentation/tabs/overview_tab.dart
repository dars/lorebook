import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_spacing.dart';
import '../../../../app/theme/decorations.dart';
import '../../data/portrait_service.dart';
import '../../domain/character.dart';
import '../../domain/character_providers.dart';
import '../widgets/portrait_transform.dart';
import '../widgets/info_field.dart';

class OverviewTab extends StatelessWidget {
  final Character character;

  const OverviewTab({super.key, required this.character});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        context.bottomNavClearance,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Hero(character: character),
          CollapsibleSection(
            title: 'BASIC 基本資訊',
            child: _InfoGrid(character: character),
          ),
          CollapsibleSection(
            title: 'STATS 戰鬥數值',
            child: _StatCards(character: character),
          ),
        ],
      ),
    );
  }
}

class _Hero extends ConsumerStatefulWidget {
  final Character character;
  const _Hero({required this.character});

  @override
  ConsumerState<_Hero> createState() => _HeroState();
}

class _HeroState extends ConsumerState<_Hero> {
  bool _busy = false;

  /// 立繪原始尺寸（取景計算需要；null = 尚未解析）。
  Size? _imageSize;
  String _resolvedUrl = '';

  /// 取景調整模式（進入後以 InteractiveViewer 互動，完成才儲存）。
  bool _adjusting = false;
  bool _viewerInitPending = false;
  PortraitTransform? _lastTransform;
  Size? _lastFrame;
  final _viewerController = TransformationController();

  @override
  void dispose() {
    _viewerController.dispose();
    super.dispose();
  }

  /// 解析圖片原始尺寸（URL 變更時重解析）。
  void _resolveImageSize(String url) {
    if (url.isEmpty || url == _resolvedUrl) return;
    _resolvedUrl = url;
    final stream = NetworkImage(url).resolve(const ImageConfiguration());
    late final ImageStreamListener listener;
    listener = ImageStreamListener((info, _) {
      final size = Size(
        info.image.width.toDouble(),
        info.image.height.toDouble(),
      );
      stream.removeListener(listener);
      // 快取命中時回呼會在 build 期間同步觸發，setState 一律延後到
      // frame 結束，避免「setState during build」。
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _imageSize = size);
      });
    }, onError: (_, _) => stream.removeListener(listener));
    stream.addListener(listener);
  }

  Future<void> _upload() async {
    final bytes = await PortraitService.pick();
    if (bytes == null) return;
    setState(() => _busy = true);
    try {
      final url = await ref
          .read(portraitServiceProvider)
          .upload(widget.character.id, bytes);
      ref.read(currentCharacterProvider.notifier).setPortraitUrl(url);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('上傳失敗（離線或未登入時無法上傳）')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove() async {
    setState(() => _busy = true);
    try {
      await ref.read(portraitServiceProvider).remove(widget.character.id);
      ref.read(currentCharacterProvider.notifier).setPortraitUrl('');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('移除失敗（離線或未登入時無法移除）')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// 儲存取景（自 viewer 矩陣反解正規化值）並離開調整模式。
  void _saveTransform() {
    final t = _lastTransform;
    final frame = _lastFrame;
    if (t == null || frame == null) {
      setState(() => _adjusting = false);
      return;
    }
    final (scale, cx, cy) = portraitNormalize(
      matrix: _viewerController.value,
      frame: frame,
      childWidth: t.childWidth,
      childHeight: t.childHeight,
    );
    ref
        .read(currentCharacterProvider.notifier)
        .setPortraitTransform(scale: scale, centerX: cx, centerY: cy);
    setState(() => _adjusting = false);
  }

  Widget _pillButton(String label, {bool filled = false, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: filled ? AppColors.accentGold : const Color(0x99000000),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: filled ? AppColors.accentGold : AppColors.darkBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'NotoSerifTC',
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: filled ? const Color(0xFF1A1206) : AppColors.darkTextLight,
          ),
        ),
      ),
    );
  }

  /// 已有圖：bottom sheet 提供更換/移除；無圖：直接選圖上傳。
  void _onEdit() {
    if (widget.character.portraitUrl.isEmpty) {
      _upload();
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.darkSurface1,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text(
                '更換角色圖',
                style: TextStyle(fontFamily: 'NotoSerifTC'),
              ),
              onTap: () {
                Navigator.pop(sheetContext);
                _upload();
              },
            ),
            ListTile(
              leading: const Icon(Icons.open_with),
              title: const Text(
                '調整圖片位置',
                style: TextStyle(fontFamily: 'NotoSerifTC'),
              ),
              onTap: () {
                Navigator.pop(sheetContext);
                setState(() {
                  _adjusting = true;
                  _viewerInitPending = true;
                });
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.delete_outline,
                color: AppColors.danger,
              ),
              title: const Text(
                '移除角色圖',
                style: TextStyle(
                  fontFamily: 'NotoSerifTC',
                  color: AppColors.danger,
                ),
              ),
              onTap: () {
                Navigator.pop(sheetContext);
                _remove();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final character = widget.character;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: kPortraitMaxWidth),
        child: AspectRatio(
          aspectRatio: kPortraitAspectRatio,
          child: _heroCard(character),
        ),
      ),
    );
  }

  Widget _heroCard(Character character) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppSpacing.radiusCharacterHeader),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF2E2418), Color(0xFF1E160C), Color(0xFF14110C)],
          ),
          border: Border.all(color: AppColors.darkBorder, width: 1),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 角色圖（立繪位）：套用持久化取景；無圖時為佔位浮水印。
            if (character.portraitUrl.isNotEmpty)
              LayoutBuilder(
                builder: (context, constraints) {
                  _resolveImageSize(character.portraitUrl);
                  final img = _imageSize;
                  final frame = Size(
                    constraints.maxWidth,
                    constraints.maxHeight,
                  );
                  if (img == null) {
                    // 尺寸未解析前先以 cover 顯示，避免閃空。
                    return Image.network(
                      character.portraitUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    );
                  }
                  final t = portraitTransformFor(
                    frame: frame,
                    image: img,
                    userScale: character.portraitScale,
                    centerX: character.portraitCenterX,
                    centerY: character.portraitCenterY,
                  );
                  final child = SizedBox(
                    width: t.childWidth,
                    height: t.childHeight,
                    child: Image.network(
                      character.portraitUrl,
                      fit: BoxFit.fill,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  );
                  if (_adjusting) {
                    _lastTransform = t;
                    _lastFrame = frame;
                    if (_viewerInitPending) {
                      _viewerInitPending = false;
                      _viewerController.value = t.matrix;
                    }
                    return InteractiveViewer(
                      transformationController: _viewerController,
                      constrained: false,
                      minScale: kPortraitMinScale,
                      maxScale: kPortraitMaxScale,
                      child: child,
                    );
                  }
                  return ClipRect(
                    child: OverflowBox(
                      alignment: Alignment.topLeft,
                      minWidth: 0,
                      minHeight: 0,
                      maxWidth: double.infinity,
                      maxHeight: double.infinity,
                      child: Transform(transform: t.matrix, child: child),
                    ),
                  );
                },
              )
            else
              Center(
                child: Icon(
                  Icons.auto_awesome,
                  size: 120,
                  color: AppColors.accentGold.withValues(alpha: 0.06),
                ),
              ),
            // 底部漸層加深，確保文字可讀（純顯示層，放行手勢給底下的
            // InteractiveViewer）。
            const IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.center,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x00000000), Color(0xCC000000)],
                  ),
                ),
              ),
            ),
            IgnorePointer(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${character.className} ${character.classNameEn.toUpperCase()} · ${character.subclass}',
                      style: const TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 13,
                        letterSpacing: 2,
                        color: AppColors.accentGold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      character.name,
                      style: const TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 44,
                        fontWeight: FontWeight.w700,
                        height: 1.05,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      character.nameEn.toUpperCase(),
                      style: TextStyle(
                        fontFamily: 'Cinzel',
                        fontSize: 16,
                        letterSpacing: 8,
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '${character.background} · ${character.alignment} · ${character.deity}信徒',
                      style: TextStyle(
                        fontFamily: 'NotoSerifTC',
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // 調整模式：取消 / 完成
            if (_adjusting)
              Positioned(
                top: AppSpacing.md,
                right: AppSpacing.md,
                child: Row(
                  children: [
                    _pillButton(
                      '取消',
                      onTap: () {
                        setState(() => _adjusting = false);
                      },
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _pillButton('完成', filled: true, onTap: _saveTransform),
                  ],
                ),
              ),
            // 編輯鈕（右上角）：上傳 / 更換 / 移除角色圖
            if (!_adjusting)
              Positioned(
                top: AppSpacing.md,
                right: AppSpacing.md,
                child: _busy
                    ? Container(
                        width: 36,
                        height: 36,
                        padding: const EdgeInsets.all(9),
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0x99000000),
                        ),
                        child: const CircularProgressIndicator(strokeWidth: 2),
                      )
                    : GestureDetector(
                        onTap: _onEdit,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0x99000000),
                            border: Border.all(color: AppColors.darkBorder),
                          ),
                          child: const Icon(
                            Icons.photo_camera_outlined,
                            size: 18,
                            color: AppColors.darkTextLight,
                          ),
                        ),
                      ),
              ),
          ],
        ),
      ),
    );
  }
}

class _InfoGrid extends StatelessWidget {
  final Character character;
  const _InfoGrid({required this.character});

  @override
  Widget build(BuildContext context) {
    final rows = <List<InfoField>>[
      [
        InfoField(
          label: 'SPECIES · 物種',
          value: character.species,
          valueEn: character.speciesEn,
        ),
        InfoField(label: 'TYPE · 生物類型', value: character.creatureType),
      ],
      [
        InfoField(label: 'SIZE · 體型', value: character.size),
        InfoField(
          label: 'ALIGNMENT · 陣營',
          value: character.alignment,
          valueEn: character.alignmentEn,
        ),
      ],
      [
        InfoField(
          label: 'DEITY · 信仰',
          value: character.deity,
          valueEn: character.deityEn,
        ),
        InfoField(
          label: 'BACKGROUND · 背景',
          value: character.background,
          valueEn: character.backgroundEn,
        ),
      ],
    ];

    final divider = Theme.of(
      context,
    ).colorScheme.outline.withValues(alpha: 0.4);

    return ParchmentCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xl,
        vertical: AppSpacing.sm,
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0) Divider(color: divider, height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: rows[i][0]),
                  const SizedBox(width: AppSpacing.lg),
                  Expanded(child: rows[i][1]),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatCards extends StatelessWidget {
  final Character character;
  const _StatCards({required this.character});

  @override
  Widget build(BuildContext context) {
    final speedNum = character.speed.replaceAll(RegExp(r'[^0-9]'), '');
    final stats = [
      _StatData('SPEED', speedNum, '速度', Icons.directions_run),
      _StatData(
        'PROF',
        character.proficiencyBonus >= 0
            ? '+${character.proficiencyBonus}'
            : '${character.proficiencyBonus}',
        '熟練',
        Icons.verified_outlined,
      ),
      _StatData(
        'PERC',
        '${character.passivePerception}',
        '察覺',
        Icons.visibility_outlined,
      ),
      _StatData('DC', '${character.spellDc}', '法術 DC', Icons.auto_awesome),
    ];

    return Row(
      children: [
        for (var i = 0; i < stats.length; i++) ...[
          if (i > 0) const SizedBox(width: AppSpacing.sm),
          Expanded(child: _StatCard(data: stats[i])),
        ],
      ],
    );
  }
}

class _StatData {
  final String label;
  final String value;
  final String sub;
  final IconData icon;
  const _StatData(this.label, this.value, this.sub, this.icon);
}

class _StatCard extends StatelessWidget {
  final _StatData data;
  const _StatCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ParchmentCard(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Column(
        children: [
          Icon(data.icon, size: 16, color: AppColors.accentGold),
          const SizedBox(height: 4),
          Text(
            data.value,
            style: const TextStyle(
              fontFamily: 'Cinzel',
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.accentGold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            data.sub,
            style: TextStyle(
              fontFamily: 'NotoSerifTC',
              fontSize: 10,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
        ],
      ),
    );
  }
}
