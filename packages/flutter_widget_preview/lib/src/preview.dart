import 'package:flutter_widget_preview/flutter_widget_preview.dart';

/// Marks the function used as the Flutter Widget Preview application's entry builder.
///
/// The annotated function receives the selected [PreviewWidget] and
/// wraps it with the app-level widgets needed to render the preview,
/// such as `MaterialApp`, themes, and localization.
const preview = PreviewBuilder;
