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
  'ownerEmail',
  'backendStack',
  'frontendStack',
  'database',
  'multiTenant',
  'complianceScope',
  'profile',
];

/**
 * Collect bootstrap values from interactive prompts.
 * Used when --yes is not passed and flags are incomplete.
 */
export async function collectBootstrapValues(overrides = {}) {
  const projectTypeOptions = ['SaaS', 'Internal Tool', 'API', 'Platform', 'Library'];
  const frontendStackOptions = ['None', 'React', 'Next.js', 'Vue', 'Nuxt'];
  const complianceOptions = ['N/A', 'GDPR', 'ISO27001', 'HIPAA', 'SOC2', 'PCI-DSS'];

  const questions = [
    {
      name: 'projectName',
      type: 'text',
      message: 'Project name (slug, e.g. billing-api):',
      validate: (v) => /^[a-z0-9-]+$/.test(v) || 'Use lowercase letters, numbers, and hyphens only',
      initial: overrides.projectName,
    },
    {
      name: 'displayName',
      type: 'text',
      message: 'Display name (e.g. Billing API):',
      initial: overrides.displayName,
    },
    {
      name: 'purpose',
      type: 'text',
      message: 'One-line purpose:',
      initial: overrides.purpose,
    },
    {
      name: 'projectType',
      type: 'select',
      message: 'Project type:',
      choices: projectTypeOptions,
      initial: projectTypeOptions.indexOf(overrides.projectType ?? 'SaaS'),
    },
    {
      name: 'ownerEmail',
      type: 'text',
      message: 'Owner email:',
      validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address',
      initial: overrides.ownerEmail,
    },
    {
      name: 'backendStack',
      type: 'text',
      message: 'Backend stack (e.g. Laravel + PHP):',
      initial: overrides.backendStack ?? 'None',
    },
    {
      name: 'frontendStack',
      type: 'select',
      message: 'Frontend stack:',
      choices: frontendStackOptions,
      initial: frontendStackOptions.indexOf(overrides.frontendStack ?? 'None'),
    },
    {
      name: 'database',
      type: 'text',
      message: 'Database (e.g. PostgreSQL 16):',
      initial: overrides.database ?? 'None',
    },
    {
      name: 'multiTenant',
      type: 'toggle',
      message: 'Multi-tenant?',
      active: 'yes',
      inactive: 'no',
      initial: overrides.multiTenant ?? false,
    },
    {
      name: 'complianceScope',
      type: 'select',
      message: 'Compliance scope:',
      choices: complianceOptions,
      initial: complianceOptions.indexOf(overrides.complianceScope ?? 'N/A'),
    },
    {
      name: 'profile',
      type: 'select',
      message: 'Scaffold profile:',
      choices: PROFILE_CHOICES,
      initial: Math.max(PROFILE_CHOICES.indexOf(overrides.profile ?? 'generic'), 0),
    },
  ];

  const answers = await prompts(questions, {
    onCancel: () => {
      console.log('\nAborted.');
      process.exit(1);
    },
  });

  return {
    ...answers,
    profile: normalizeProfile(answers.profile),
  };
}

/**
 * Merge command-line flags with defaults for --yes / non-interactive mode.
 * Any value not provided via flag gets a conservative default and is tracked as defaulted.
 */
export function resolveWithDefaults(flags = {}) {
  const defaulted = [];
  const resolved = { ...flags };

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
    projectType: 'SaaS',
    frontendStack: 'None',
    database: 'N/A',
    multiTenant: false,
    complianceScope: 'N/A',
    profile: 'generic',
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (resolved[key] === undefined) {
      resolved[key] = value;
      defaulted.push(key);
    }
  }

  applyProfileDefaults(resolved, defaulted);

  return { resolved, defaulted };
}

function applyProfileDefaults(resolved, defaulted) {
  const defaultsByProfile = {
    laravel: {
      backendStack: 'PHP/Laravel',
      frontendStack: 'optional',
      database: 'MySQL or PostgreSQL',
    },
    node: {
      backendStack: 'Node.js',
      frontendStack: 'None',
      database: 'N/A',
    },
  };

  const profileDefaults = defaultsByProfile[resolved.profile] ?? {};
  for (const [key, value] of Object.entries(profileDefaults)) {
    if (resolved[key] === undefined || resolved[key] === 'None' || resolved[key] === 'N/A') {
      resolved[key] = value;
      if (!defaulted.includes(key)) {
        defaulted.push(key);
      }
    }
  }
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
