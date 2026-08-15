import 'package:flutter_widget_preview/flutter_widget_preview.dart';

/// A toggle control for changing a boolean value in the preview.
class PreviewBooleanControl extends PreviewControl<bool> {
  const PreviewBooleanControl({
    super.key,
    super.initialValue,
    super.defaultValue,
    required super.displayName,
    super.description,
  });

  @override
  String get kind => 'boolean';

  @override
  bool deserialize(String value) => switch (value) {
    'true' => true,
    'false' => false,
    _ => throw FormatException('Invalid boolean: $value'),
  };
}
