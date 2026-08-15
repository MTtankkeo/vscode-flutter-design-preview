import 'package:flutter_widget_preview/flutter_widget_preview.dart';

/// A numeric control for changing an integer value in the preview.
class PreviewIntegerControl extends PreviewControl<int> {
  const PreviewIntegerControl({
    super.key,
    super.initialValue,
    super.defaultValue,
    required super.displayName,
    super.description,
    this.minValue,
    this.maxValue,
  });

  /// The optional lower bound shown by the Flutter Widget Preview control.
  final int? minValue;

  /// The optional upper bound shown by the Flutter Widget Preview control.
  final int? maxValue;

  @override
  String get kind => 'integer';

  @override
  Map<String, Object?> get metaData => {
    'min': minValue,
    'max': maxValue,
  };

  @override
  int deserialize(String value) => int.parse(value);
}
