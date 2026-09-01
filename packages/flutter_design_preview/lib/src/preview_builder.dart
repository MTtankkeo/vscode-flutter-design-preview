import 'package:flutter/widgets.dart';
import 'package:flutter_design_preview/flutter_design_preview.dart';

/// Builds the Flutter Design Preview application around the selected [PreviewWidget].
///
/// A top-level function with this signature can be marked with [preview] and
/// used like an app entry point. It is the right place to provide shared
/// widgets such as [Directionality], themes, or a custom app shell.
typedef PreviewBuilder = Widget Function(PreviewWidget preview);
