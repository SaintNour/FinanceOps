/**
 * Dev-only: ensures import template blueprints stay aligned with field aliases and sample CSV shape.
 * Non-blocking; does not throw.
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { FIELD_SETS } from '../import/fieldAliases.js';
import { IMPORT_TEMPLATE_BLUEPRINTS } from '../import/importTemplateDefinitions.js';

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** @param {string} importType @param {string} [field] @param {string} message @param {{ importType: string, field?: string, message: string }[]} out */
function warn(importType, field, message, out) {
  out.push({ importType, field, message });
}

export function validateDuplicateBlueprintColumns(blueprint, out) {
  const seen = new Set();
  for (const col of blueprint.columns) {
    if (seen.has(col.key)) {
      warn(blueprint.importType, col.key, `Duplicate column key "${col.key}" in blueprint`, out);
    }
    seen.add(col.key);
  }
}

/** A. Template column keys must exist as canonical keys in FIELD_SETS. */
export function validateTemplateColumnsInFieldSet(blueprint, fieldSet, out) {
  const canonicalKeys = new Set(Object.keys(fieldSet || {}));
  for (const col of blueprint.columns) {
    if (!canonicalKeys.has(col.key)) {
      warn(
        blueprint.importType,
        col.key,
        `Unknown field in template: "${col.key}" (not a canonical key in field aliases for this type)`,
        out,
      );
    }
  }
}

/** B. Each template column key appears in that field's alias list (sample headers map in preview). */
export function validateTemplateKeyRecognizedAsAlias(blueprint, fieldSet, out) {
  for (const col of blueprint.columns) {
    const aliases = fieldSet[col.key];
    if (!aliases) continue;
    const hit = aliases.some((a) => norm(a) === norm(col.key));
    if (!hit) {
      warn(
        blueprint.importType,
        col.key,
        `Field "${col.key}" is not listed as an alias for its canonical field (add "${col.key}" to aliases or fix template key)`,
        out,
      );
    }
  }
}

/** D. Required flags reference real canonical fields. */
export function validateRequiredFieldConfiguration(blueprint, fieldSet, out) {
  const keys = new Set(blueprint.columns.map((c) => c.key));
  const requiredCols = blueprint.columns.filter((c) => c.required);
  for (const col of requiredCols) {
    if (!keys.has(col.key)) {
      warn(blueprint.importType, col.key, `Required field "${col.key}" is not in columns list`, out);
    }
    if (!fieldSet[col.key]) {
      warn(
        blueprint.importType,
        col.key,
        `Required field "${col.key}" has no field alias entry`,
        out,
      );
    }
  }
}

/** E. Sample rows: full key set per row; no stray keys. */
export function validateSampleRowShape(blueprint, out) {
  const keys = blueprint.columns.map((c) => c.key);

  function rowFromBlueprint() {
    const row = {};
    for (const col of blueprint.columns) {
      row[col.key] = col.example;
    }
    return row;
  }

  const rows = [rowFromBlueprint(), ...(blueprint.extraRows || [])];

  rows.forEach((row, index) => {
    const label = index === 0 ? 'first (example) row' : `extraRows[${index - 1}]`;
    for (const k of keys) {
      if (!Object.prototype.hasOwnProperty.call(row, k)) {
        warn(
          blueprint.importType,
          k,
          `Sample ${label}: missing key "${k}" (expected ${keys.length} columns to match headers)`,
          out,
        );
      }
    }
    for (const k of Object.keys(row)) {
      if (!keys.includes(k)) {
        warn(
          blueprint.importType,
          k,
          `Sample ${label}: unexpected key "${k}" (not in blueprint columns)`,
          out,
        );
      }
    }
  });
}

/** C. Field alias entries: each canonical has at least one alias string. */
export function validateFieldSetAliasLists(fieldSet, importType, out) {
  for (const [canonical, aliases] of Object.entries(fieldSet || {})) {
    if (!Array.isArray(aliases) || aliases.length === 0) {
      warn(importType, canonical, `Field "${canonical}" has empty alias list`, out);
      continue;
    }
    for (const al of aliases) {
      if (String(al).trim() === '') {
        warn(importType, canonical, `Field "${canonical}" has an empty alias string`, out);
      }
    }
  }
}

export function runImportTemplateValidation() {
  /** @type {{ importType: string, field?: string, message: string }[]} */
  const warnings = [];

  for (const importType of Object.keys(FIELD_SETS)) {
    validateFieldSetAliasLists(FIELD_SETS[importType], importType, warnings);
  }

  for (const blueprint of Object.values(IMPORT_TEMPLATE_BLUEPRINTS)) {
    const typeKey = blueprint.importType;
    const fieldSet = FIELD_SETS[typeKey];
    if (!fieldSet) {
      warn(typeKey, undefined, `No FIELD_SETS entry for blueprint importType "${typeKey}"`, warnings);
      continue;
    }

    validateDuplicateBlueprintColumns(blueprint, warnings);
    validateTemplateColumnsInFieldSet(blueprint, fieldSet, warnings);
    validateTemplateKeyRecognizedAsAlias(blueprint, fieldSet, warnings);
    validateRequiredFieldConfiguration(blueprint, fieldSet, warnings);
    validateSampleRowShape(blueprint, warnings);
  }

  return warnings;
}

/**
 * @param {TemplateValidationWarning[]} warnings
 */
export function printImportTemplateValidationReport(warnings) {
  console.log('\n[IMPORT TEMPLATE VALIDATION]\n');

  if (!warnings.length) {
    console.log('No issues found. Blueprints align with field aliases and sample rows.\n');
    return;
  }

  const byType = new Map();
  for (const w of warnings) {
    if (!byType.has(w.importType)) byType.set(w.importType, []);
    byType.get(w.importType).push(w);
  }

  const order = [...Object.keys(FIELD_SETS)];
  for (const t of order) {
    const list = byType.get(t);
    if (!list?.length) continue;
    console.log(`[${t}]`);
    for (const w of list) {
      const field = w.field ? ` (${w.field})` : '';
      console.log(`  ⚠${field} ${w.message}`);
    }
    console.log('');
  }

  const orphan = [...byType.keys()].filter((t) => !order.includes(t));
  for (const t of orphan) {
    console.log(`[${t}]`);
    for (const w of byType.get(t)) {
      const field = w.field ? ` (${w.field})` : '';
      console.log(`  ⚠${field} ${w.message}`);
    }
    console.log('');
  }

  console.log(`Total warnings: ${warnings.length}\n`);
}

const __filename = fileURLToPath(import.meta.url);
const isMainModule = path.resolve(process.argv[1] || '') === path.resolve(__filename);

if (isMainModule) {
  printImportTemplateValidationReport(runImportTemplateValidation());
}
