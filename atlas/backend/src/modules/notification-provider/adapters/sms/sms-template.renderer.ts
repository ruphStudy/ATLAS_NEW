import { Injectable } from '@nestjs/common';

/**
 * Renders ATLAS-side SMS templates via `{{var}}` substitution — the same
 * convention used by the ai-prompt module's `compilePrompt` and by the
 * email adapter's `EmailTemplateRenderer`, kept as its own small,
 * dependency-free utility per-adapter rather than a shared templating
 * library.
 */
@Injectable()
export class SmsTemplateRenderer {
  render(template: string, variables?: Record<string, unknown>): string {
    if (!variables) return template;

    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
      const value = variables[key];
      return value === undefined || value === null ? match : String(value);
    });
  }
}
