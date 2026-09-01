import 'package:flutter/material.dart';
import 'package:flutter_design_preview/flutter_design_preview.dart';

@preview
Widget previewDefaultBuilder(PreviewWidget widget) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ThemeData.light(),
    darkTheme: ThemeData.dark(),
    themeMode: PreviewBinding.themeMode,
    home: Container(
      alignment: Alignment.center,
      padding: EdgeInsets.all(24),
      child: Material(
        type: MaterialType.transparency,
        child: Builder(
          builder: widget.build,
        ),
      ),
    ),
  );
}
