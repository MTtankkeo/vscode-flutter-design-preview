import 'package:flutter/foundation.dart' as foundation;
import 'package:flutter/material.dart';

/// Applies the brightness selected in the Flutter Design Preview toolbar to Flutter.
///
/// The Flutter Design Preview runner updates this binding when the user switches
/// between light, dark, and system modes. Preview widgets normally
/// do not need to call this class directly.
abstract final class PreviewBinding {
  static ThemeMode _themeMode = ThemeMode.system;
  static Brightness _systemBrightness = Brightness.light;

  /// The theme mode currently selected in the Flutter Design Preview toolbar.
  static ThemeMode get themeMode => _themeMode;

  /// Changes the Flutter Design Preview's theme mode and applies its effective brightness.
  /// When set to [ThemeMode.system], the current [systemBrightness] is used.
  static set themeMode(ThemeMode value) {
    _themeMode = value;
    _applyBrightness();
  }

  /// The brightness reported by the host when [themeMode] is system.
  static Brightness get systemBrightness => _systemBrightness;

  /// Updates the host brightness used by the system theme mode.
  static set systemBrightness(Brightness value) {
    _systemBrightness = value;
    _applyBrightness();
  }

  /// The effective brightness after resolving [themeMode].
  static Brightness get brightness {
    return switch (_themeMode) {
      ThemeMode.light => .light,
      ThemeMode.dark => .dark,
      ThemeMode.system => _systemBrightness,
    };
  }

  static void _applyBrightness() {
    foundation.debugBrightnessOverride = brightness;
  }
}
