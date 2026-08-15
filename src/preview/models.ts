/** Source location of the optional function annotated with `@preview`. */
export interface PreviewBuilder {
  name: string;
  file: string;
}

/** Metadata required to import, display, and instantiate a preview widget. */
export interface PreviewWidget {
  className: string;
  displayName: string;
  groupName?: string;
  file: string;
}

/** Declarations discovered from the Flutter project's preview source files. */
export interface PreviewSourceSnapshot {
  /** Optional application-level builder marked with `@preview`. */
  builder?: PreviewBuilder;

  /** Preview widgets available to the generated runner. */
  widgets: PreviewWidget[];
}

/** Source state associated with the currently running preview session. */
export interface ActivePreview {
  /** Root directory of the Flutter project that owns the session. */
  projectRoot: string;

  /** Last discovered declarations used to generate the preview runner. */
  source: PreviewSourceSnapshot;
}

/** Creates a stable key that remains unique when class names are reused across files. */
export function widgetId(widget: PreviewWidget): string {
  return `${widget.file}#${widget.className}`;
}
