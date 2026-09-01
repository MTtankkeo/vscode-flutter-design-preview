// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;

import 'package:flutter/widgets.dart';
import 'package:flutter_design_preview/flutter_design_preview.dart';

/// Hosts discovered Flutter Design Preview entries and connects them to the VS Code panel.
///
/// This widget receives toolbar and control updates from the parent webview,
/// then sends the currently available controls back after Flutter finishes
/// a frame. Generated Flutter Design Preview applications create this widget automatically.
class PreviewRunner extends StatefulWidget {
  const PreviewRunner({
    super.key,
    required this.initialId,
    required this.widgets,
    required this.builder,
  });

  /// The preview selected when the runner starts.
  final String initialId;

  /// All discovered Flutter Design Preview entries, keyed by their generated identifiers.
  final Map<String, PreviewWidget> widgets;

  /// Wraps the selected preview in the user's shared app layout.
  final PreviewBuilder builder;

  @override
  State<PreviewRunner> createState() => _PreviewRunnerState();
}

class _PreviewRunnerState extends State<PreviewRunner> {
  /// Identifier of the preview currently displayed in the canvas.
  late String selectedId;

  /// Subscription used to receive commands from the parent VS Code webview.
  late final StreamSubscription<html.MessageEvent> messageSubscription;

  /// Stores controls separately for each preview.
  final Map<String, PreviewController> controlsControllers = {};

  /// Prevents multiple controls snapshots from being queued in one frame.
  bool controlsMessageScheduled = false;

  /// Returns the controller for the selected preview, creating it on first use.
  ///
  /// Controller changes schedule a fresh controls snapshot for the host UI.
  PreviewController get controlsController {
    return controlsControllers.putIfAbsent(
      selectedId,
      () => PreviewController()..addListener(_scheduleMessage),
    );
  }

  @override
  void initState() {
    super.initState();

    // Start with the ID chosen by the generated runner and begin listening
    // for commands as soon as this widget enters the tree.
    selectedId = widget.initialId;
    messageSubscription = html.window.onMessage.listen(_handleMessage);
  }

  /// Decodes a host message and dispatches each supported protocol command.
  void _handleMessage(html.MessageEvent event) {
    // Browser messages can come from unrelated sources, so malformed or
    // unsupported messages are ignored instead of interrupting the preview.
    if (event.data is! String) return;

    try {
      final message = jsonDecode(event.data as String);

      if (message is Map) {
        return switch (message['type']) {
          'setBrightness' => _setBrightness(message),
          'selectWidget' => _selectWidget(message),
          'updateControl' => _updateControl(message),
          _ => () => debugPrint(message.toString()),
        };
      }
    } on FormatException {
      return;
    }
  }

  /// Applies the theme mode and system brightness selected in the host toolbar.
  void _setBrightness(Map<Object?, Object?> message) {
    setState(() {
      final themeMode = message['themeMode'];
      final systemBrightness = message['systemBrightness'];

      PreviewBinding.systemBrightness = systemBrightness == 'dark' ? .dark : .light;

      PreviewBinding.themeMode = switch (themeMode) {
        'dark' => .dark,
        'light' => .light,
        _ => .system,
      };
    });
  }

  /// Displays the requested preview when its ID belongs to this runner.
  void _selectWidget(Map<Object?, Object?> message) {
    final Object? nextId = message['id'];
    if (nextId is String && widget.widgets.containsKey(nextId)) {
      setState(() => selectedId = nextId);
      _scheduleMessage();
    }
  }

  /// Applies a serialized control value to the selected Flutter Design Preview's control.
  void _updateControl(Map<Object?, Object?> message) {
    final Object? id = message['id'];
    if (id is String) controlsController.update(id, message['value']);
  }

  /// Queues one controls snapshot after the current Flutter frame completes.
  void _scheduleMessage() {
    // Several controls can register or update during one build. Send one
    // complete snapshot after the frame instead of one message per control.
    if (controlsMessageScheduled) return;
    controlsMessageScheduled = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      controlsMessageScheduled = false;
      if (!mounted) return;

      _postMessage({
        'type': 'previewControls',
        'controls': controlsController.controls.map(_serializeControl).toList(),
      });
    });
  }

  /// Converts one control and its current state into the host protocol format.
  Map<String, Object?> _serializeControl(PreviewControl<Object?> control) {
    final state = controlsController.stateOf(control);
    final mayBeValue = state.mayBeValue;
    final value = mayBeValue ?? control.defaultValue;

    return {
      'kind': control.kind,
      'id': control.id,
      'name': control.displayName,
      'description': control.description,
      'value': value == null ? null : control.serialize(value),
      'mayBeValue': mayBeValue == null ? null : control.serialize(mayBeValue),
      'hasDefault': control.defaultValue != null,
      'nullable': control.defaultValue == null,
      ...control.metaData,
    };
  }

  /// Sends a JSON protocol message to the VS Code webview containing the app.
  void _postMessage(Map<String, Object?> message) {
    html.window.parent?.postMessage(jsonEncode(message), '*');
  }

  @override
  void dispose() {
    // The browser subscription and per-Flutter Design Preview controllers outlive individual
    // builds, so release all of them when the runner leaves the widget tree.
    messageSubscription.cancel();

    for (final controller in controlsControllers.values) {
      controller.removeListener(_scheduleMessage);
      controller.dispose();
    }

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // The scope lets controls read their controller through BuildContext. The
    // user-provided builder then supplies the app shell around the selected
    // item.
    return PreviewScope(
      key: ValueKey(selectedId),
      controller: controlsController,
      child: widget.builder(widget.widgets[selectedId]!),
    );
  }
}
