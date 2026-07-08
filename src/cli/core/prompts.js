/**
 * Prompts module — collects bootstrap values from interactive prompts or command-line flags.
 * See docs/cli/placeholder-resolution.md for full specification.
 */

import prompts from 'prompts';
import { PROFILE_CHOICES, normalizeProfile } from './paths.js';

/**
 * Minimum prompt/flag inputs required for create/init.
 * @type {string[]}
 */
export const REQUIRED_VALUES = [
  'projectName',
  'displayName',
  'purpose',
  'projectType',
  'lifecycleStage',
  'ownerEmail',
  'backendStack',
  'frontendStack',
  'database',
  'multiTenant',
  'dataSensitivity',
  'complianceScope',
  'requirementsSource',
  'requirementsPath',
  'profile',
];

export const PROJECT_TYPE_CHOICES = [
  { title: 'SaaS product', value: 'saas' },
  { title: 'Internal tool', value: 'internal-tool' },
  { title: 'API / backend service', value: 'api' },
  { title: 'Web application', value: 'web-app' },
  { title: 'Full-stack application', value: 'full-stack' },
  { title: 'Library / package', value: 'library' },
  { title: 'CLI tool', value: 'cli' },
  { title: 'Mobile app', value: 'mobile' },
  { title: 'Infrastructure / DevOps', value: 'infra' },
  { title: 'Data / analytics', value: 'data' },
];

export const LIFECYCLE_STAGE_CHOICES = [
  { title: 'Discovery / planning', value: 'discovery' },
  { title: 'Active development', value: 'active-development' },
  { title: 'Production', value: 'production' },
  { title: 'Maintenance', value: 'maintenance' },
  { title: 'Legacy modernization', value: 'legacy-modernization' },
];

export const FRONTEND_STACK_CHOICES = [
  { title: 'None', value: 'none' },
  { title: 'React', value: 'react' },
  { title: 'Next.js', value: 'nextjs' },
  { title: 'Vue', value: 'vue' },
  { title: 'Nuxt', value: 'nuxt' },
  { title: 'Flutter', value: 'flutter' },
  { title: 'Other', value: 'other' },
];

export const DATA_SENSITIVITY_CHOICES = [
  { title: 'Public', value: 'public' },
  { title: 'Internal', value: 'internal' },
  { title: 'Confidential', value: 'confidential' },
  { title: 'Regulated', value: 'regulated' },
];

export const COMPLIANCE_CHOICES = [
  { title: 'GDPR', value: 'GDPR' },
  { title: 'SOC 2', value: 'SOC2' },
  { title: 'ISO 27001', value: 'ISO27001' },
  { title: 'HIPAA', value: 'HIPAA' },
  { title: 'PCI-DSS', value: 'PCI-DSS' },
];

export const REQUIREMENTS_SOURCE_CHOICES = [
  { title: 'Use existing docs/specs', value: 'existing-docs' },
  { title: 'Create requirements later', value: 'create-later' },
  { title: 'Create requirements now', value: 'create-now' },
];

const PROFILE_SELECT_CHOICES = PROFILE_CHOICES.map((profile) => ({
  title: profile,
  value: normalizeProfile(profile),
}));

const VALUE_SETS = {
  projectType: choiceValues(PROJECT_TYPE_CHOICES),
  lifecycleStage: choiceValues(LIFECYCLE_STAGE_CHOICES),
  frontendStack: choiceValues(FRONTEND_STACK_CHOICES),
  dataSensitivity: choiceValues(DATA_SENSITIVITY_CHOICES),
  complianceScope: choiceValues(COMPLIANCE_CHOICES),
  requirementsSource: choiceValues(REQUIREMENTS_SOURCE_CHOICES),
  profile: new Set(PROFILE_CHOICES.map((profile) => normalizeProfile(profile))),
};

/**
 * Collect bootstrap values from interactive prompts.
 * Used when --yes is not passed and flags are incomplete.
 */
export async function collectBootstrapValues(overrides = {}) {
  const normalizedOverrides = normalizeValues(overrides);

  const questions = [
    {
      name: 'projectName',
      type: 'text',
      message: 'Project name (slug, e.g. billing-api):',
      validate: (v) => /^[a-z0-9-]+$/.test(v) || 'Use lowercase letters, numbers, and hyphens only',
      initial: normalizedOverrides.projectName,
    },
    {
      name: 'displayName',
      type: 'text',
      message: 'Display name (e.g. Billing API):',
      initial: normalizedOverrides.displayName,
    },
    {
      name: 'purpose',
      type: 'text',
      message: 'One-line purpose:',
      initial: normalizedOverrides.purpose,
    },
    {
      name: 'projectType',
      type: 'select',
      message: 'Project kind:',
      choices: PROJECT_TYPE_CHOICES,
      initial: choiceIndex(PROJECT_TYPE_CHOICES, normalizedOverrides.projectType ?? 'saas'),
    },
    {
      name: 'lifecycleStage',
      type: 'select',
      message: 'Lifecycle stage:',
      choices: LIFECYCLE_STAGE_CHOICES,
      initial: choiceIndex(LIFECYCLE_STAGE_CHOICES, normalizedOverrides.lifecycleStage ?? 'active-development'),
    },
    {
      name: 'ownerEmail',
      type: 'text',
      message: 'Owner email:',
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address',
      initial: normalizedOverrides.ownerEmail,
    },
    {
      name: 'backendStack',
      type: 'text',
      message: 'Primary/backend stack (e.g. Node.js, Laravel + PHP):',
      initial: normalizedOverrides.backendStack ?? 'none',
    },
    {
      name: 'frontendStack',
      type: 'select',
      message: 'Frontend stack:',
      choices: FRONTEND_STACK_CHOICES,
      initial: choiceIndex(FRONTEND_STACK_CHOICES, normalizedOverrides.frontendStack ?? 'none'),
    },
    {
      name: 'database',
      type: 'text',
      message: 'Database (e.g. PostgreSQL 16):',
      initial: normalizedOverrides.database ?? 'none',
    },
    {
      name: 'multiTenant',
      type: 'toggle',
      message: 'Multi-tenant?',
      active: 'yes',
      inactive: 'no',
      initial: normalizedOverrides.multiTenant ?? false,
    },
    {
      name: 'dataSensitivity',
      type: 'select',
      message: 'Data sensitivity:',
      choices: DATA_SENSITIVITY_CHOICES,
      initial: choiceIndex(DATA_SENSITIVITY_CHOICES, normalizedOverrides.dataSensitivity ?? 'internal'),
    },
    {
      name: 'complianceScope',
      type: 'multiselect',
      message: 'Compliance scope:',
      choices: COMPLIANCE_CHOICES,
      initial: complianceInitialIndexes(normalizedOverrides.complianceScope),
      hint: '- Space to select. Leave empty for none.',
    },
    {
      name: 'requirementsSource',
      type: 'select',
      message: 'Requirements source:',
      choices: REQUIREMENTS_SOURCE_CHOICES,
      initial: choiceIndex(REQUIREMENTS_SOURCE_CHOICES, normalizedOverrides.requirementsSource ?? 'create-later'),
    },
    {
      name: 'requirementsPath',
      type: 'text',
      message: 'Requirements path, if known:',
      initial: normalizedOverrides.requirementsPath ?? '',
    },
    {
      name: 'profile',
      type: 'select',
      message: 'Scaffold profile:',
      choices: PROFILE_SELECT_CHOICES,
      initial: choiceIndex(PROFILE_SELECT_CHOICES, normalizeProfile(normalizedOverrides.profile ?? 'generic')),
    },
    {
      name: 'testCommand',
      type: 'text',
      message: 'Test command:',
      initial: normalizedOverrides.testCommand ?? 'none',
    },
    {
      name: 'lintCommand',
      type: 'text',
      message: 'Lint command:',
      initial: normalizedOverrides.lintCommand ?? 'none',
    },
    {
      name: 'typecheckCommand',
      type: 'text',
      message: 'Typecheck command:',
      initial: normalizedOverrides.typecheckCommand ?? 'none',
    },
    {
      name: 'buildCommand',
      type: 'text',
      message: 'Build command:',
      initial: normalizedOverrides.buildCommand ?? 'none',
    },
  ];

  const answers = await prompts(questions, {
    onCancel: () => {
      console.log('\nAborted.');
      process.exit(1);
    },
  });

  const normalizedAnswers = normalizeValues(answers);
  assertValidBootstrapValues(normalizedAnswers);
  return normalizedAnswers;
}

/**
 * Merge command-line flags with defaults for --yes / non-interactive mode.
 * Any value not provided via flag gets a conservative default and is tracked as defaulted.
 */
export function resolveWithDefaults(flags = {}) {
  const defaulted = [];
  const resolved = normalizeValues(flags);

  if (resolved.profile !== undefined) {
    resolved.profile = normalizeProfile(resolved.profile);
  }

  // Derive displayName and purpose from projectName when not provided
  if (!resolved.displayName && resolved.projectName) {
    resolved.displayName = toTitleCase(resolved.projectName);
    defaulted.push('displayName');
  }
  if (!resolved.purpose && resolved.displayName) {
    resolved.purpose = `${resolved.displayName} — scaffold-managed project`;
    defaulted.push('purpose');
  }

  const defaults = {
    projectType: 'saas',
    lifecycleStage: 'active-development',
    frontendStack: 'none',
    database: 'none',
    multiTenant: false,
    dataSensitivity: 'internal',
    complianceScope: [],
    requirementsSource: 'create-later',
    requirementsPath: '',
    testCommand: 'none',
    lintCommand: 'none',
    typecheckCommand: 'none',
    buildCommand: 'none',
    profile: 'generic',
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (resolved[key] === undefined) {
      resolved[key] = value;
      defaulted.push(key);
    }
  }

  applyProfileDefaults(resolved, defaulted);
  assertValidBootstrapValues(resolved);

  return { resolved, defaulted };
}

function applyProfileDefaults(resolved, defaulted) {
  const defaultsByProfile = {
    laravel: {
      backendStack: 'PHP/Laravel',
      frontendStack: 'none',
      database: 'MySQL or PostgreSQL',
      testCommand: 'composer test',
    },
    node: {
      backendStack: 'Node.js',
      frontendStack: 'none',
      database: 'none',
      testCommand: 'npm test',
      lintCommand: 'npm run lint',
      typecheckCommand: 'npm run typecheck',
      buildCommand: 'npm run build',
    },
  };

  const profileDefaults = defaultsByProfile[resolved.profile] ?? {};
  for (const [key, value] of Object.entries(profileDefaults)) {
    if (resolved[key] === undefined || resolved[key] === 'none' || resolved[key] === '') {
      resolved[key] = value;
      if (!defaulted.includes(key)) {
        defaulted.push(key);
      }
    }
  }
}

function normalizeValues(values = {}) {
  const normalized = { ...values };

  if (normalized.profile !== undefined) {
    normalized.profile = normalizeProfile(normalized.profile);
  }

  if (normalized.projectType !== undefined) {
    normalized.projectType = normalizeChoiceValue(normalized.projectType, {
      SaaS: 'saas',
      'Internal Tool': 'internal-tool',
      API: 'api',
      Library: 'library',
    });
  }

  if (normalized.lifecycleStage !== undefined) {
    normalized.lifecycleStage = normalizeChoiceValue(normalized.lifecycleStage, {
      MVP: 'active-development',
      Production: 'production',
      'Active Development': 'active-development',
    });
  }

  if (normalized.frontendStack !== undefined) {
    normalized.frontendStack = normalizeChoiceValue(normalized.frontendStack, {
      None: 'none',
      'N/A': 'none',
      React: 'react',
      'Next.js': 'nextjs',
      Vue: 'vue',
      Nuxt: 'nuxt',
      Flutter: 'flutter',
    });
  }

  if (normalized.database !== undefined) {
    normalized.database = normalizeNone(normalized.database);
  }

  if (normalized.dataSensitivity !== undefined) {
    normalized.dataSensitivity = normalizeChoiceValue(normalized.dataSensitivity, {
      Public: 'public',
      Internal: 'internal',
      Confidential: 'confidential',
      Regulated: 'regulated',
    });
  }

  if (normalized.requirementsSource !== undefined) {
    normalized.requirementsSource = normalizeChoiceValue(normalized.requirementsSource, {
      'Existing docs': 'existing-docs',
      'Existing Docs': 'existing-docs',
      'Create later': 'create-later',
      'Create Later': 'create-later',
      'Create now': 'create-now',
      'Create Now': 'create-now',
    });
  }

  if (normalized.complianceScope !== undefined) {
    normalized.complianceScope = normalizeCompliance(normalized.complianceScope);
  }

  for (const commandKey of ['testCommand', 'lintCommand', 'typecheckCommand', 'buildCommand']) {
    if (normalized[commandKey] !== undefined) {
      normalized[commandKey] = normalizeNone(normalized[commandKey]);
    }
  }

  return normalized;
}

function normalizeChoiceValue(value, legacyMap) {
  if (value === undefined || value === null) {
    return value;
  }
  const strValue = String(value).trim();
  return legacyMap[strValue] ?? strValue.toLowerCase();
}

function normalizeNone(value) {
  if (value === undefined || value === null) {
    return value;
  }
  const strValue = String(value).trim();
  if (strValue === '' || ['n/a', 'none', 'no', 'optional'].includes(strValue.toLowerCase())) {
    return 'none';
  }
  return strValue;
}

function normalizeCompliance(value) {
  if (Array.isArray(value)) {
    return value.flatMap(normalizeCompliance).filter(Boolean);
  }

  if (value === undefined || value === null) {
    return [];
  }

  const raw = String(value).trim();
  if (raw === '' || ['n/a', 'none', 'no'].includes(raw.toLowerCase())) {
    return [];
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const normalized = item.toUpperCase().replace(/\s+/g, '');
      if (normalized === 'ISO27001' || normalized === 'ISO-27001') return 'ISO27001';
      if (normalized === 'PCIDSS' || normalized === 'PCI-DSS') return 'PCI-DSS';
      return normalized;
    });
}

export function validateBootstrapValues(values = {}) {
  const errors = [];
  checkValue(errors, 'projectType', values.projectType, VALUE_SETS.projectType);
  checkValue(errors, 'lifecycleStage', values.lifecycleStage, VALUE_SETS.lifecycleStage);
  checkValue(errors, 'frontendStack', values.frontendStack, VALUE_SETS.frontendStack);
  checkValue(errors, 'dataSensitivity', values.dataSensitivity, VALUE_SETS.dataSensitivity);
  checkValue(errors, 'requirementsSource', values.requirementsSource, VALUE_SETS.requirementsSource);
  checkValue(errors, 'profile', values.profile, VALUE_SETS.profile);

  const complianceScope = values.complianceScope ?? [];
  if (!Array.isArray(complianceScope)) {
    errors.push(`complianceScope must be an array or comma-separated list`);
  } else {
    for (const scope of complianceScope) {
      checkValue(errors, 'complianceScope', scope, VALUE_SETS.complianceScope);
    }
  }

  return errors;
}

export function assertValidBootstrapValues(values = {}) {
  const errors = validateBootstrapValues(values);
  if (errors.length > 0) {
    throw new Error(`Invalid scaffold setup value(s):\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  }
}

export function validateManifestContext(manifestData = {}, settingsData = null) {
  const invalid = [];

  checkStoredValue(invalid, '.ai-scaffold.json project.kind', manifestData?.project?.kind, VALUE_SETS.projectType);
  checkStoredValue(invalid, '.ai-scaffold.json project.lifecycleStage', manifestData?.project?.lifecycleStage, VALUE_SETS.lifecycleStage);
  checkStoredValue(invalid, '.ai-scaffold.json stack.frontend', manifestData?.stack?.frontend, VALUE_SETS.frontendStack);
  checkStoredValue(invalid, '.ai-scaffold.json risk.dataSensitivity', manifestData?.risk?.dataSensitivity, VALUE_SETS.dataSensitivity);
  checkStoredValue(invalid, '.ai-scaffold.json requirements.source', manifestData?.requirements?.source, VALUE_SETS.requirementsSource);
  checkStoredValue(invalid, '.ai-scaffold.json profile', manifestData?.profile, VALUE_SETS.profile);

  const complianceScope = manifestData?.risk?.complianceScope;
  if (complianceScope !== undefined) {
    if (!Array.isArray(complianceScope)) {
      invalid.push('.ai-scaffold.json risk.complianceScope');
    } else {
      for (const scope of complianceScope) {
        checkStoredValue(invalid, `.ai-scaffold.json risk.complianceScope:${scope}`, scope, VALUE_SETS.complianceScope);
      }
    }
  }

  if (settingsData) {
    checkStoredValue(invalid, 'settings project.type', settingsData?.project?.type, VALUE_SETS.projectType);
    checkStoredValue(invalid, 'settings project.lifecycleStage', settingsData?.project?.lifecycleStage, VALUE_SETS.lifecycleStage);
    checkStoredValue(invalid, 'settings techStack.frontend', settingsData?.techStack?.frontend, VALUE_SETS.frontendStack);
    checkStoredValue(invalid, 'settings project.dataSensitivity', settingsData?.project?.dataSensitivity, VALUE_SETS.dataSensitivity);
    checkStoredValue(invalid, 'settings project.requirementsSource', settingsData?.project?.requirementsSource, VALUE_SETS.requirementsSource);
  }

  return invalid;
}

function choiceValues(choices) {
  return new Set(choices.map((choice) => choice.value));
}

function checkValue(errors, field, value, allowedValues) {
  if (value === undefined || value === null) {
    return;
  }
  if (!allowedValues.has(value)) {
    errors.push(`${field}=${JSON.stringify(value)}; allowed: ${[...allowedValues].join(', ')}`);
  }
}

function checkStoredValue(invalid, field, value, allowedValues) {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value === 'number' || !allowedValues.has(value)) {
    invalid.push(field);
  }
}

function choiceIndex(choices, value) {
  return Math.max(choices.findIndex((choice) => choice.value === value), 0);
}

function complianceInitialIndexes(values = []) {
  const selected = normalizeCompliance(values);
  return COMPLIANCE_CHOICES
    .map((choice, index) => selected.includes(choice.value) ? index : -1)
    .filter((index) => index >= 0);
}

/**
 * Convert a kebab-case or snake-case slug to Title Case.
 * e.g. "billing-api" → "Billing Api"
 */
function toTitleCase(str) {
  return str
    .split(/[-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
