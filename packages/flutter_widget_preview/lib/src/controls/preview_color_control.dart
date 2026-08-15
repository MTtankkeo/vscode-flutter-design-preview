import 'package:flutter/widgets.dart';
import 'package:flutter_widget_preview/flutter_widget_preview.dart';

/// A color picker for changing a [Color] value in the preview.
///
/// Colors are exchanged with the Flutter Widget Preview UI as six-digit RGB hex strings.
/// Alpha values are intentionally treated as fully opaque.
class PreviewColorControl extends PreviewControl<Color> {
  const PreviewColorControl({
    super.key,
    super.initialValue,
    super.defaultValue,
    required super.displayName,
    super.description,
  });

  @override
  String get kind => 'color';

  @override
  String serialize(Color value) {
    final rgb = value.toARGB32().toRadixString(16).padLeft(8, '0').substring(2);
    return '#$rgb';
  }

  @override
  Color deserialize(String value) {
    final hex = value.startsWith('#') ? value.substring(1) : value;
    final rgb = int.tryParse(hex, radix: 16);
    if (rgb == null || hex.length != 6) {
      throw FormatException('Invalid color: $value');
    }
    return Color(0xff000000 | rgb);
  }
}
