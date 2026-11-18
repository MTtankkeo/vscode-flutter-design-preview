import 'package:material_ui/material_ui.dart';
import 'package:flutter_design_preview/flutter_design_preview.dart';

@preview
Widget previewDefaultBuilder(PreviewWidget widget) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: .light(),
    darkTheme: .dark(),
    themeMode: PreviewBinding.themeMode,
    home: Container(
      alignment: .center,
      padding: .all(24),
      child: Material(
        type: .transparency,
        child: Builder(builder: widget.build),
      ),
    ),
  );
}
