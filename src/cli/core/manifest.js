/**
 * Manifest and settings data builders.
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import { getVersion } from './version.js';
import { toPosixPath } from './paths.js';

export function buildManifestData(values) {
  return {
    version: getVersion(),
    profile: values.profile,
    bootstrapped: true,
    bootstrapCompletedAt: today(),
    installedAt: today(),
    updatedAt: today(),
    source: 'ai-scaffold',
    project: {
      slug: values.projectName,
      displayName: values.displayName,
      purpose: values.purpose,
      kind: values.projectType,
      lifecycleStage: values.lifecycleStage,
      owner: values.ownerEmail,
    },
    stack: {
      primary: values.backendStack,
      backend: values.backendStack,
      frontend: values.frontendStack,
      database: values.database,
    },
    risk: {
      multiTenant: values.multiTenant,
      dataSensitivity: values.dataSensitivity,
      complianceScope: values.complianceScope ?? [],
    },
    requirements: {
      source: values.requirementsSource,
      paths: values.requirementsPath ? [values.requirementsPath] : [],
    },
    commands: {
      install: values.installCommand,
      dev: values.devCommand,
      migration: values.migrationCommand,
      test: values.testCommand,
      lint: values.lintCommand,
      typecheck: values.typecheckCommand,
      build: values.buildCommand,
    },
    defaultedValues: values.defaulted ?? [],
    managedFiles: [],
  };
}

export function buildSettingsOverridesData(values) {
  return {
    project: {
      name: values.projectName,
      displayName: values.displayName,
      purpose: values.purpose,
      type: values.projectType,
      lifecycleStage: values.lifecycleStage,
      status: lifecycleStageToStatus(values.lifecycleStage),
      multiTenant: values.multiTenant,
      complianceScope: values.complianceScope,
      dataSensitivity: values.dataSensitivity,
      requirementsSource: values.requirementsSource,
      requirementsPath: values.requirementsPath,
      owner: values.ownerEmail,
      firstEpic: values.purpose,
    },
    techStack: {
      backend: values.backendStack,
      frontend: values.frontendStack,
      database: values.database,
      cacheQueue: 'N/A',
      auth: 'N/A',
      email: 'N/A',
      storage: 'N/A',
      cloud: 'N/A',
      iac: 'N/A',
      cicd: 'GitHub Actions',
      projectMgmt: 'GitHub Projects',
    },
    commands: {
      install: values.installCommand,
      dev: values.devCommand,
      migration: values.migrationCommand,
      test: values.testCommand,
      lint: values.lintCommand,
      typecheck: values.typecheckCommand,
      build: values.buildCommand,
    },
    features: {
      accessibility: false,
      gdpr: hasCompliance(values, 'GDPR'),
      iso27001: hasCompliance(values, 'ISO27001'),
      sast: true,
      preCommitFull: true,
      iac: false,
      cicd: 'basic',
      mfa: false,
      auditLog: true,
      asyncJobs: false,
    },
  };
}

export async function buildManagedFileRecords(targetDir, relPaths) {
  const uniquePaths = [...new Set(relPaths.map(toPosixPath))]
    .filter((relPath) => relPath !== '.ai-scaffold.json')
    .sort();

  const records = [];
  for (const relPath of uniquePaths) {
    const fullPath = path.join(targetDir, relPath);
    if (!(await fs.pathExists(fullPath))) {
      continue;
    }
    const hash = crypto
      .createHash('sha256')
      .update(await fs.readFile(fullPath))
      .digest('hex');
    records.push({ path: relPath, hash: `sha256:${hash}` });
  }
  return records;
}

function hasCompliance(values, scope) {
  return Array.isArray(values.complianceScope) && values.complianceScope.includes(scope);
}

function lifecycleStageToStatus(stage) {
  const labels = {
    discovery: 'Discovery',
    'active-development': 'Active Development',
    production: 'Production',
    maintenance: 'Maintenance',
    'legacy-modernization': 'Legacy Modernization',
  };
  return labels[stage] ?? 'Active Development';
}

function today() {
  return new Date().toISOString().split('T')[0];
}
