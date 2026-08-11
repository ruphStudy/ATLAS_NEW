import { Injectable } from '@nestjs/common';

/**
 * Renders ATLAS-side email templates via `{{var}}` substitution — the same
 * substitution convention used by the ai-prompt module's `compilePrompt`
 * (regex replace of `{{key}}` placeholders against a variables bag). Kept
 * as a small, dependency-free utility rather than introducing a templating
 * library, consistent with how prompts are compiled elsewhere in this
 * codebase.
 */
@Injectable()
export class EmailTemplateRenderer {
  render(template: string, variables?: Record<string, unknown>): string {
    if (!variables) return template;

    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
      const value = variables[key];
      return value === undefined || value === null ? match : String(value);
    });
  }
}
