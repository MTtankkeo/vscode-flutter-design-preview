import 'package:flutter_widget_preview/flutter_widget_preview.dart';

/// A text control for changing a [String] value in the preview.
class PreviewStringControl extends PreviewControl<String> {
  const PreviewStringControl({
    super.key,
    super.initialValue,
    super.defaultValue,
    required super.displayName,
    super.description,
    this.maxLength,
  });

  /// The maximum number of characters accepted by the Flutter Widget Preview control.
  final int? maxLength;

  @override
  String get kind => 'string';

  @override
  Map<String, Object?> get metaData => {
    'maxLength': maxLength,
    'defaultValue': defaultValue,
  };
}
