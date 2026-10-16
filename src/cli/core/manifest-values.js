/**
 * Render values from a manifest: the inverse of buildManifestData (item 25,
 * BRD FR-05, FR-28). `ais update` renders only from `.ai-scaffold.json`.
 */

/**
 * @param {object} manifest  parsed `.ai-scaffold.json`
 * @returns {object} values accepted by renderPlannedFile and resolvePlaceholders
 */
export function valuesFromManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('valuesFromManifest: manifest must be an object');
  }
  const project = manifest.project ?? {};
  const stack = manifest.stack ?? {};
  const risk = manifest.risk ?? {};
  const requirements = manifest.requirements ?? {};
  const commands = manifest.commands ?? {};
  const paths = Array.isArray(requirements.paths) ? requirements.paths : [];

  return {
    profile: manifest.profile,
    installMode: manifest.install?.mode,
    projectName: project.slug,
    displayName: project.displayName,
    purpose: project.purpose,
    projectType: project.kind,
    lifecycleStage: project.lifecycleStage,
    ownerEmail: project.owner,
    backendStack: stack.backend,
    frontendStack: stack.frontend,
    database: stack.database,
    multiTenant: risk.multiTenant,
    dataSensitivity: risk.dataSensitivity,
    complianceScope: Array.isArray(risk.complianceScope) ? [...risk.complianceScope] : [],
    requirementsSource: requirements.source,
    // Spike F1: create stores an empty path as [], which must render as ''.
    requirementsPath: paths[0] ?? '',
    installCommand: commands.install,
    devCommand: commands.dev,
    migrationCommand: commands.migration,
    testCommand: commands.test,
    lintCommand: commands.lint,
    typecheckCommand: commands.typecheck,
    buildCommand: commands.build,
    defaulted: Array.isArray(manifest.defaultedValues) ? [...manifest.defaultedValues] : [],
  };
}
