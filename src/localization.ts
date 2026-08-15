import * as vscode from "vscode";
import english from "./locales/en.json";
import korean from "./locales/ko.json";

// Use English as both the fallback locale and the schema for other translations.
// The VS Code display language is fixed when the Extension Host starts, so select it once.
const dictionary: typeof english = vscode.env.language
  .toLowerCase()
  .startsWith("ko")
  ? korean
  : english;

// Preserve unresolved placeholders so mistakes in translation files remain visible.
function format(template: string, values: Record<string, string>): string {
  return template.replace(
    /\{(\w+)\}/g,
    (placeholder, key: string) => values[key] ?? placeholder,
  );
}

/**
 * Localized messages for the current VS Code display language.
 * Parameterized messages are exposed as functions that insert runtime values.
 */
export const messages = {
  ...dictionary,

  processExited: (code: number | null) => {
    return format(dictionary.processExited, { code: String(code) });
  },

  previewFailed: (error: string) => {
    return format(dictionary.previewFailed, { error });
  },
};
