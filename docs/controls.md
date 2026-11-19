# What the Guards Stop, and What They Don't

AI Scaffold ships four kinds of control. They are not equal, and none of them
is a sandbox. This page says, per tool, what each one actually stops, so an
instruction is never mistaken for a guarantee.

| Kind | Where it lives | Applies to |
|---|---|---|
| **Git hooks** | `.claude/hooks/pre-commit` and `commit-msg`, installed into git | Every commit, from any tool or person |
| **CI** | `.github/workflows/ci.yml`, plus `.ai-scaffold/ci/branch-flow.yml` once you activate it | Every push and pull request |
| **Claude Code settings and hooks** | `.claude/settings.json`, `.claude/hooks/*.sh` | Claude Code only |
| **Instructions** | `AGENTS.md`, `CLAUDE.md`, `.claude/rules/`, `.cursorrules`, `.github/copilot-instructions.md` | Whatever the model chooses to follow |

Only git hooks and CI apply to every tool, and only CI and branch protection
cannot be skipped locally. The Claude Code layer is an extra for one tool.
Instructions are requests, not controls.

## Per tool

| Control | Claude Code | Codex | Cursor | Copilot | Local models |
|---|---|---|---|---|---|
| `pre-commit`: branch name, lint, typecheck, tests or `scripts/verify`, gitleaks | Yes | Yes | Yes | Yes | Yes |
| `commit-msg`: rejects `Co-Authored-By:` | Yes | Yes | Yes | Yes | Yes |
| CI: lint, typecheck, tests, dependency audit, gitleaks, Semgrep | Yes | Yes | Yes | Yes | Yes |
| Branch protection, once applied | Yes | Yes | Yes | Yes | Yes |
| `permissions.deny`: secret file reads | File tools only | No | No | No | No |
| `permissions.ask`: force push, hard reset, recursive delete | Yes | No | No | No | No |
| `pre-secret-guard.sh`: secret paths | File tools only | No | No | No | No |
| `pre-dangerous-bash-guard.sh`: destructive commands | Yes | No | No | No | No |
| `pre-bash-quality-gate.sh`: git hooks installed before `git commit` | Yes, see limits | No | No | No | No |
| `pre-write-fact-check.sh`: file cited but not read | Warns only | No | No | No | No |
| `post-write-console-warn.sh`: new debug output | Reports after the edit | No | No | No | No |
| `governance-file-guard.sh`: governance files read or edited | Warns | No | No | No | No |
| `token-budget-guard.sh`: session size | Warns at 300K, blocks at 500K | No | No | No | No |
| Instructions in `AGENTS.md` and rules | Read | Read | Read | Read through its instruction file | Depends on the harness |

"No" means AI Scaffold ships nothing for that tool. The tool may have its own
approval or sandbox settings; configure those yourself.

## What each control does not stop

**Git hooks.** `git commit --no-verify` skips them, like any git hook. A check
whose tool is not installed is skipped with a message, gitleaks included, so a
machine without gitleaks commits with no local secrets scan. CI and branch
protection are what make the rules hold.

**CI.** It runs after the push. It catches a committed secret or a failing
test, but a secret pushed to a shared branch is already exposed: rotate it. The
gitleaks action needs a `GITLEAKS_LICENSE` secret in organisation repositories.

**Deny rules and the secret guard.** They stop Claude's Read, Edit, Write,
Grep and Glob tools from opening a secret file. They do not stop a shell
command. Any program Claude runs (`cat .env`, a test, a dependency's script
inside `npm test`) can read `.env` with your user's permissions. Only an
operating-system sandbox stops that, and the scaffold does not configure one.
Native Windows has no Claude Code sandbox; WSL2 does.

**Ask rules and the dangerous-command guard.** They match the command text.
They catch the common spellings of force push, `git reset --hard`, `git clean`,
`git checkout -- .`, `git filter-branch`, recursive forced deletes outside
regenerated build folders, and a download piped into a shell. A command built
at run time, run from a script, or spelled in a way the patterns do not list
gets through. They do not cover `git rebase`, `git filter-repo`,
`git branch -D` or `git push --delete`.

**The quality gate.** It reads `git commit` from the command text and checks
the hooks of the repository in the hook's working directory, so
`git -C <dir> commit` and `cd <dir> && git commit` are not checked. The git
hooks themselves still run on those commits.

**The fact check.** Advisory: it prints a warning and lets the edit through
unless `ECC_FACT_CHECK_STRICT=1` is set. Without a JSON parser (jq or Python)
it does nothing.

**The console warning.** A PostToolUse hook: it reports a new `console.log`
or similar after the edit is made. It cannot prevent or undo the edit.

**Any Claude Code hook.** A hook that crashes or times out lets the tool call
through, except the secret guard and the dangerous-command guard, which are set
to block on failure (`onFailure: "block"`, Claude Code 2.1.295 or later).

## Why each deny and ask entry is there

The test is "can it be undone?". An action that cannot be undone gets a deny
rule or an explicit approval. Anything git or a rerun recovers does not.

### Denied reads

A secret that reaches a model's context may be logged, cached or sent on; that
cannot be undone, so each of these is denied to Claude's file tools.

| Entry | What it protects |
|---|---|
| `Read(.env)` | Local environment secrets |
| `Read(.env.*)` | Per-environment secret files |
| `Read(!.env.example)` | Exception: placeholder template, safe to read |
| `Read(!.env.sample)` | Exception: placeholder template, safe to read |
| `Read(!.env.template)` | Exception: placeholder template, safe to read |
| `Read(.npmrc)` | npm registry tokens |
| `Read(.pypirc)` | PyPI upload tokens |
| `Read(auth.json)` | Composer and similar registry credentials |
| `Read(id_rsa*)` | SSH private keys |
| `Read(id_ecdsa*)` | SSH private keys |
| `Read(id_ed25519*)` | SSH private keys |
| `Read(*.pem)` | Certificates and private keys |
| `Read(*.key)` | Private keys |
| `Read(*.p12)` | Certificate bundles with keys |
| `Read(*.pfx)` | Certificate bundles with keys |
| `Read(*.jks)` | Java keystores |
| `Read(*.keystore)` | Keystores |
| `Read(*.tfstate)` | Terraform state, which stores provider secrets in clear |
| `Read(*.tfstate.*)` | Terraform state backups |
| `Read(*.tfvars)` | Terraform variables, often credentials |
| `Read(*.tfvars.json)` | Terraform variables, often credentials |
| `Read(*service-account*.json)` | Cloud service-account keys |
| `Read(secrets/**)` | Conventional secrets folder |
| `Read(.ssh/**)` | SSH keys and config |
| `Read(.aws/**)` | AWS CLI credentials |
| `Read(.azure/**)` | Azure CLI credentials |
| `Read(.gcloud/**)` | Google Cloud CLI credentials |
| `Read(.gnupg/**)` | GPG private keys |

Not covered by a deny rule: `.netrc`, `.git-credentials`,
`.docker/config.json` and `.kube/config`. Keep them out of the project
directory.

### Commands that need approval

| Entry | Can it be undone? |
|---|---|
| `Bash(git push *--force*)` | Only from another clone or the server's reflog: overwrites shared history |
| `Bash(git push -f*)` | As above |
| `Bash(git push * -f*)` | As above |
| `Bash(git push * +*)` | As above: a `+` refspec forces the push |
| `Bash(git reset --hard*)` | No, for uncommitted work |
| `Bash(git clean *)` | No: deletes untracked files git never recorded |
| `Bash(git checkout -- *)` | No, for uncommitted changes |
| `Bash(git filter-branch*)` | Only from a backup: rewrites history |
| `Bash(rm -r*)` | No, for untracked files |
| `Bash(rm -R*)` | As above |
| `Bash(rm -fr*)` | As above |
| `Bash(rm -fR*)` | As above |
| `Bash(rm * -r*)` | As above |
| `Bash(rm * -R*)` | As above |
| `Bash(rm *--recursive*)` | As above |

Not listed, because git or a rerun recovers them: ordinary edits, commits,
branches, installs, builds and tests.

## Next steps

1. Apply branch protection:
   `bash .ai-scaffold/setup/setup-branch-protection.sh owner/repo`.
2. Install gitleaks locally so the pre-commit scan runs; keep it in CI.
3. If an agent runs commands unattended, run it in a sandbox or container with
   no access to your real credentials.
