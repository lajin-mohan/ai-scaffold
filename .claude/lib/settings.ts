// Settings reader — single source of truth for project configuration.
// Reads settings-overrides.json (committed, shared team baseline) and
// settings-local.json (gitignored, local dev overrides).
//
// Precedence: settings-local.json > settings-overrides.json > defaults

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectType = 'mvp' | 'production-saas' | 'internal-tool' | 'public-api'

export type CicdMode = 'minimal' | 'full'

export type IacMode = boolean | 'deferred'

export interface FeatureFlags {
  accessibility: boolean
  gdpr: boolean
  iso27001: boolean
  sast: boolean
  preCommitFull: boolean
  iac: IacMode
  cicd: CicdMode
  mfa: boolean
  auditLog: boolean
  asyncJobs: boolean
}

export interface ProjectIdentity {
  name: string
  displayName: string
  purpose: string
  type: ProjectType
  multiTenant: boolean
  owner: string
  firstEpic: string
}

export interface Settings {
  project: ProjectIdentity
  features: FeatureFlags
  _source: 'overrides' | 'local'  // which file provided each field (for display)
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature defaults by project type
// ─────────────────────────────────────────────────────────────────────────────

const FEATURE_DEFAULTS: Record<ProjectType, FeatureFlags> = {
  'mvp': {
    accessibility: false,
    gdpr: false,
    iso27001: false,
    sast: false,
    preCommitFull: false,
    iac: 'deferred',
    cicd: 'minimal',
    mfa: false,
    auditLog: false,
    asyncJobs: false,
  },
  'production-saas': {
    accessibility: false,  // opt-in for SaaS
    gdpr: true,
    iso27001: true,
    sast: true,
    preCommitFull: true,
    iac: true,
    cicd: 'full',
    mfa: true,
    auditLog: true,
    asyncJobs: true,
  },
  'internal-tool': {
    accessibility: false,
    gdpr: false,
    iso27001: false,
    sast: false,
    preCommitFull: true,
    iac: false,
    cicd: 'minimal',
    mfa: false,
    auditLog: false,
    asyncJobs: false,
  },
  'public-api': {
    accessibility: false,
    gdpr: false,
    iso27001: false,
    sast: true,
    preCommitFull: false,
    iac: false,
    cicd: 'full',
    mfa: true,
    auditLog: false,
    asyncJobs: false,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Core API
// ─────────────────────────────────────────────────────────────────────────────

let _cache: Settings | null = null

export function getSettings(): Settings {
  if (_cache) return _cache
  _cache = _readSettings()
  return _cache
}

export function clearSettingsCache(): void {
  _cache = null
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────────────────────────────────────

function _readSettings(): Settings {
  const overridesPath = resolve(ROOT, '.claude/settings-overrides.json')
  const localPath = resolve(ROOT, '.claude/settings-local.json')

  const hasOverrides = existsSync(overridesPath)
  const hasLocal = existsSync(localPath)

  // No settings file at all — return defaults based on placeholder state
  if (!hasOverrides && !hasLocal) {
    return _defaultsFromPlaceholders()
  }

  // Read both files
  const overrides = hasOverrides ? _readJson(overridesPath) : {}
  const local = hasLocal ? _readJson(localPath) : {}

  // Deep merge: local wins over overrides
  const merged = _deepMerge(overrides, local)

  // Apply type-based defaults for any missing feature flags
  const type: ProjectType = merged.project?.type ?? 'mvp'
  const defaults = FEATURE_DEFAULTS[type]
  merged.features = { ...defaults, ...merged.features }

  return merged as Settings
}

function _readJson(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

function _deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && key in result && typeof result[key] === 'object') {
      result[key] = _deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

function _defaultsFromPlaceholders(): Settings {
  // Scaffold has not been bootstrapped — return sensible defaults for template state
  // Commands should check this and fall back gracefully
  return {
    project: {
      name: '{{PROJECT_NAME}}',
      displayName: '{{PROJECT_NAME}}',
      purpose: '{{ONE_LINE_PURPOSE}}',
      type: 'mvp',
      multiTenant: true,
      owner: '{{OWNER_EMAIL}}',
      firstEpic: '{{EPIC_NAME}}',
    },
    features: FEATURE_DEFAULTS['mvp'],
    _source: 'overrides',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature flag helpers (used by commands)
// ─────────────────────────────────────────────────────────────────────────────

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const settings = getSettings()
  return settings.features[feature] === true || settings.features[feature] === 'full' || settings.features[feature] === true
}

export function getIacMode(): IacMode {
  return getSettings().features.iac
}

export function getCicdMode(): CicdMode {
  return getSettings().features.cicd
}

export function isComplianceEnabled(type: 'gdpr' | 'iso27001' | 'accessibility'): boolean {
  return getSettings().features[type]
}

export function getProjectType(): ProjectType {
  return getSettings().project.type
}

// Display helpers for /settings command
export function listFeaturesWithDefaults(): Array<{ key: keyof FeatureFlags; current: boolean | string; default: boolean | string; overridden: boolean }> {
  const settings = getSettings()
  const defaults = FEATURE_DEFAULTS[settings.project.type]
  const current = settings.features

  return (Object.keys(defaults) as Array<keyof FeatureFlags>).map(key => ({
    key,
    current: current[key],
    default: defaults[key],
    overridden: JSON.stringify(current[key]) !== JSON.stringify(defaults[key]),
  }))
}