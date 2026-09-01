import 'package:flutter/widgets.dart';
import 'package:flutter_design_preview/flutter_design_preview.dart';

/// Holds the current value of a [PreviewControl].
///
/// [mayBeValue] is the explicit value selected in the Flutter Design Preview UI.
/// [value] returns that value when available, otherwise it falls back to [defaultValue].
class PreviewControlState<T> extends ValueNotifier<T?> {
  PreviewControlState({
    required this.control,
    required T? initialValue,
    required this.defaultValue,
  }) : super(initialValue);

  /// The control whose value is managed by this state.
  final PreviewControl control;

  /// The value used when [mayBeValue] is `null`.
  final T? defaultValue;

  /// The explicitly selected value, or `null` to use [defaultValue].
  T? get mayBeValue => super.value;
  set mayBeValue(T? newValue) => super.value = newValue;

  /// The effective non-null value for the preview.
  @override
  T get value {
    final currentValue = mayBeValue ?? defaultValue;
    if (currentValue == null) {
      throw StateError('PreviewControl.value requires either initialValue or defaultValue.');
    }

    return currentValue;
  }
}
