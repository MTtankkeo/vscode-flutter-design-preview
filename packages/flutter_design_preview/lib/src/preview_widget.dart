import 'package:flutter/widgets.dart';

/// Defines a widget entry that appears in the Flutter Design Preview list.
///
/// Extend this class for each state or variation you want to include, then
/// provide its label and build the actual widget in [build].
abstract class PreviewWidget {
  /// The label shown for this entry in the Flutter Design Preview list.
  String get displayName;

  /// The nested group path used to organize this entry, from outer to inner.
  ///
  /// For example, `['Buttons', 'Primary']` places the entry in the Primary
  /// group nested below Buttons. An empty list uses the default fallback group.
  List<String> get groups => [];

  /// Builds the widget displayed in the Flutter Design Preview canvas.
  Widget build(BuildContext context);
}
