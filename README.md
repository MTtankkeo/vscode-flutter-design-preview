# Introduction

Develop, test, and interact with Flutter widgets directly inside VS Code. Iterate faster with instant Hot Reload as you build and refine your UI.

![sample](https://github.com/MTtankkeo/vscode-flutter-widget-preview/raw/refs/heads/main/media/images/sample.png)

## Features

- 🖼️ Preview Flutter widgets without launching the full application

- 🔍 Discover every class that extends `PreviewWidget`

- 🗂️ Organize previews with display names and optional groups

- 🌓 Switch between system, light, and dark themes

- 🎛️ Change widget values from interactive boolean, color, number, select, and text controls

- ⚡ Hot Reload ordinary Dart changes and Hot Restart when the preview registry changes

- 🧩 Supply a shared `MaterialApp`, theme, localization, or app shell with `@preview`

## Usage

### 1. Add the Flutter package

Until the package is published, reference this repository from your app's `pubspec.yaml`:

```yaml
dependencies:
  flutter_widget_preview:
    git:
      url: https://github.com/MTtankkeo/vscode-flutter-widget-preview.git
      path: packages/flutter_widget_preview
```

### 2. Create a preview

Add a `PreviewWidget` subclass anywhere under your project's `lib` directory:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_widget_preview/flutter_widget_preview.dart';

class PrimaryButtonPreview extends PreviewWidget {
  static const label = PreviewControl.string(...);
  static const count = PreviewControl.integer(
    key: 'count',
    displayName: 'Count',
    description: 'Number displayed in the badge',
    defaultValue: 3,
    minValue: 0,
    maxValue: 99,
  );

  @override
  String get displayName => 'Primary';

  @override
  String get groupName => 'Button';

  @override
  Widget build(BuildContext context) {
    final label = label.of(context).value;
    final count = count.of(context).value;

    return FilledButton(child: Text('$label $count'));
  }
}
```

### Custom app builder

Declare one top-level function with `@preview` when previews need your application's theme, localization, providers, or navigation setup:

> If no custom builder is found, the extension supplies a default `MaterialApp` and centers the selected widget on the canvas.

```dart
import 'package:flutter/material.dart';
import 'package:flutter_widget_preview/flutter_widget_preview.dart';

@preview
Widget buildPreviewApp(PreviewWidget widget) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ThemeData.light(),
    darkTheme: ThemeData.dark(),
    themeMode: PreviewBinding.themeMode,
    home: ...,
  );
}
```

## Preview Controls

| Control                | Value type | Additional options |
| ---------------------- | ---------- | ------------------ |
| PreviewControl.boolean | bool       | —                  |
| PreviewControl.color   | Color      | —                  |
| PreviewControl.double  | double     | minValue, maxValue |
| PreviewControl.integer | int        | minValue, maxValue |
| PreviewControl.select  | enum       | values             |
| PreviewControl.string  | String     | maxLength          |
