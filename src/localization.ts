import * as vscode from "vscode";
import english from "./locales/en.json";
import spanish from "./locales/es.json";
import japanese from "./locales/ja.json";
import korean from "./locales/ko.json";
import brazilianPortuguese from "./locales/pt-br.json";
import simplifiedChinese from "./locales/zh-cn.json";

// Use English as both the fallback locale and the schema for other translations.
// The VS Code display language is fixed when the Extension Host starts, so select it once.
const dictionaries: Record<string, typeof english> = {
  en: english,
  es: spanish,
  ja: japanese,
  ko: korean,
  "pt-br": brazilianPortuguese,
  "zh-cn": simplifiedChinese,
};

const language = vscode.env.language.toLowerCase();

const dictionary =
  dictionaries[language] ?? dictionaries[language.split("-")[0]] ?? english;

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
