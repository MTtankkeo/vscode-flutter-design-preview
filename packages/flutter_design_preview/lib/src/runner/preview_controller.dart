import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_design_preview/flutter_design_preview.dart';

/// Owns the control values for a single widget entry.
///
/// A separate controller is kept for each preview, which prevents switching
/// between widgets from discarding the values the user already selected.
class PreviewController extends ChangeNotifier {
  final Map<String, PreviewControlState> _states = {};

  /// Controls that have been read by the current preview.
  List<PreviewControl> get controls => _states.values.map((e) => e.control).toList();

  /// Returns the existing state for [control], or creates it on first use.
  PreviewControlState<T> stateOf<T>(PreviewControl<T> control) {
    final state = _states[control.id];
    if (state != null) {
      return state as PreviewControlState<T>;
    }

    final newState = PreviewControlState<T>(
      control: control,
      initialValue: control.initialValue,
      defaultValue: control.defaultValue,
    );

    _states[control.id] = newState..addListener(notifyListeners);

    // Let the runner publish newly discovered controls after this build ends.
    scheduleMicrotask(notifyListeners);
    return newState;
  }

  /// Applies a serialized value received from the Flutter Design Preview UI.
  ///
  /// Returns `false` when the control does not exist or
  /// the value cannot be converted to the control's Dart type.
  bool update<T>(String id, T? value) {
    final state = _states[id];
    if (state == null) return false;
    if (value == null) {
      state.mayBeValue = null;
      return true;
    }

    if (value is! String) return false;

    try {
      state.mayBeValue = state.control.deserialize(value);
      return true;
    } on FormatException {
      return false;
    } on TypeError {
      return false;
    }
  }

  @override
  void dispose() {
    for (final state in _states.values) {
      state.removeListener(notifyListeners);
      state.dispose();
    }
    _states.clear();
    super.dispose();
  }
}
