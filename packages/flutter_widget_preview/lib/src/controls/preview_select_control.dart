import 'package:flutter_widget_preview/flutter_widget_preview.dart';

/// A selection control containing every enum value supplied in [values].
class PreviewSelectControl<T extends Enum> extends PreviewControl<T> {
  const PreviewSelectControl({
    super.key,
    super.initialValue,
    super.defaultValue,
    required super.displayName,
    super.description,
    required this.values,
  });

  /// The options displayed in the Flutter Widget Preview control, in display order.
  final List<T> values;

  @override
  String get kind => 'enum';

  @override
  Map<String, Object?> get metaData => {
    'defaultValue': defaultValue == null ? null : serialize(defaultValue as T),
    'options': values.map((value) => {'value': value.name, 'label': value.name}).toList(),
  };

  @override
  String serialize(T value) => value.name;

  @override
  T deserialize(String value) => values.firstWhere(
    (candidate) => candidate.name == value,
    orElse: () => throw FormatException('Invalid enum value: $value'),
  );
}
