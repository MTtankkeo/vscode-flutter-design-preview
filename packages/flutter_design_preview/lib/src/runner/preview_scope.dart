import 'package:flutter/widgets.dart';
import 'package:flutter_design_preview/flutter_design_preview.dart';

/// Makes a [PreviewController] available to widgets in one preview.
///
/// Reading a control through [PreviewControl.of] also registers a dependency,
/// so the widget rebuilds when that control is changed from VS Code.
class PreviewScope extends InheritedNotifier<PreviewController> {
  const PreviewScope({
    super.key,
    required PreviewController controller,
    required super.child,
  }) : super(notifier: controller);

  /// Returns the controller belonging to the nearest Flutter Design Preview runner.
  ///
  /// Throws a [StateError] when called outside a [PreviewScope].
  static PreviewController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<PreviewScope>();
    if (scope?.notifier == null) {
      throw StateError('PreviewControl.of(context) can only be used within the preview runtime.');
    }

    return scope!.notifier!;
  }
}
