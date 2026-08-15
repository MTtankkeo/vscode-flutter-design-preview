import 'package:flutter/widgets.dart';
import 'package:flutter_widget_preview/flutter_widget_preview.dart';

export 'controls/preview_boolean_control.dart';
export 'controls/preview_color_control.dart';
export 'controls/preview_double_control.dart';
export 'controls/preview_select_control.dart';
export 'controls/preview_integer_control.dart';
export 'controls/preview_string_control.dart';

/// Describes a value that can be changed from the Flutter Widget Preview control panel.
///
/// Call [of] inside a Flutter Widget Preview's build method to read the current value.
/// The Flutter Widget Preview runner keeps that value in sync with the control shown.
abstract class PreviewControl<T> {
  const PreviewControl({
    this.key,
    this.initialValue,
    this.defaultValue,
    required this.displayName,
    this.description = '',
  });

  /// Creates a boolean toggle control.
  static const boolean = PreviewBooleanControl.new;

  /// Creates a color picker control.
  static const color = PreviewColorControl.new;

  /// Creates a decimal number control.
  static const double = PreviewDoubleControl.new;

  /// Creates a control for selecting an enum value.
  static const select = PreviewSelectControl.new;

  /// Creates an integer number control.
  static const integer = PreviewIntegerControl.new;

  /// Creates a text input control.
  static const string = PreviewStringControl.new;

  /// A stable identifier for this control.
  ///
  /// Set this when multiple controls could have the same type and display name.
  /// If omitted, an identifier is generated from [runtimeType] and [displayName].
  final String? key;

  /// The value selected when the preview first opens.
  final T? initialValue;

  /// The fallback used when the control has no explicitly selected value.
  final T? defaultValue;

  /// The label shown next to the control.
  final String displayName;

  /// Optional supporting text shown with the control.
  final String description;

  /// The control type understood by the Flutter Widget Preview UI.
  String get kind;

  /// The identifier used to exchange updates with the Flutter Widget Preview UI.
  String get id => key ?? '$runtimeType:$displayName';

  /// Additional control metadata sent to the Flutter Widget Preview UI.
  Map<String, Object?> get metaData => const {};

  /// Converts a typed value into the text exchanged with the Flutter Widget Preview UI.
  String serialize(T value) => value.toString();

  /// Converts text received from the Flutter Widget Preview UI back into a typed value.
  T deserialize(String value) => value as T;

  /// Returns the state for this control and rebuilds dependents when it changes.
  ///
  /// This must be called below the Flutter Widget Preview runner's controls scope.
  PreviewControlState<T> of(BuildContext context) {
    return PreviewScope.of(context).stateOf(this);
  }
}
