import 'package:flutter/widgets.dart';

/// Defines a widget entry that appears in the Flutter Design Preview list.
///
/// Extend this class for each state or variation you want to include, then
/// provide its label and build the actual widget in [build].
abstract class PreviewWidget {
  /// The label shown for this entry in the Flutter Design Preview list.
  String get displayName;

  /// An optional group used to organize related entries.
  String? get groupName => null;

  /// Builds the widget displayed in the Flutter Design Preview canvas.
  Widget build(BuildContext context);
}
