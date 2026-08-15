import 'package:flutter_widget_preview/flutter_widget_preview.dart';

/// A numeric control for changing a decimal value in the preview.
class PreviewDoubleControl extends PreviewControl<double> {
  const PreviewDoubleControl({
    super.key,
    super.initialValue,
    super.defaultValue,
    required super.displayName,
    super.description,
    this.minValue,
    this.maxValue,
  });

  /// The optional lower bound shown by the Flutter Widget Preview control.
  final double? minValue;

  /// The optional upper bound shown by the Flutter Widget Preview control.
  final double? maxValue;

  @override
  String get kind => 'double';

  @override
  Map<String, Object?> get metaData => {
    'min': minValue,
    'max': maxValue,
  };

  @override
  double deserialize(String value) => double.parse(value);
}
