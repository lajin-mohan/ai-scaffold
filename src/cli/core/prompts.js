/**
 * Prompts module — collects bootstrap values from interactive prompts or command-line flags.
 * See docs/cli/placeholder-resolution.md for full specification.
 */

import prompts from 'prompts';

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
  const profileOptions = ['generic', 'laravel'];
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
      choices: profileOptions,
      initial: profileOptions.indexOf(overrides.profile ?? 'generic'),
    },
  ];

  const answers = await prompts(questions, {
    onCancel: () => {
      console.log('\nAborted.');
      process.exit(1);
    },
  });

  return answers;
}

/**
 * Merge command-line flags with defaults for --yes / non-interactive mode.
 * Any value not provided via flag gets a conservative default and is tracked as defaulted.
 */
export function resolveWithDefaults(flags = {}) {
  const defaulted = [];
  const resolved = { ...flags };

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

  return { resolved, defaulted };
}