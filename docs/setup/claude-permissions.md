# Claude Code permission rules for secrets and destructive commands

Projects created with AI Scaffold **0.15.1 or later** ship these rules in
`.claude/settings.json`. Projects created earlier don't have them, and
`ais update` can't add them yet (backlog item 25). Copy the block below into
your project's `.claude/settings.json`, inside `"permissions"`, next to the
existing `"allow"` list.

## Why

The scaffold's `pre-secret-guard.sh` hook needs `jq` or a working `python3` to
read its input. On a stock Windows machine neither is present: the Microsoft
Store `python3` stub makes the hook exit 0, so reads of `.env` and private keys
are **not blocked**. Claude Code's own permission rules need no parser and
behave the same on every platform.

- `deny` stops Claude's file tools from reading the file at all (Read, and on a
  best-effort basis Grep and Glob).
- `ask` makes Claude stop and ask you before running the command, including
  when it is part of a compound command such as `cd x && …`.

## The block

```json
"deny": [
  "Read(.env)",
  "Read(.env.*)",
  "Read(!.env.example)",
  "Read(!.env.sample)",
  "Read(!.env.template)",
  "Read(.npmrc)",
  "Read(.pypirc)",
  "Read(auth.json)",
  "Read(id_rsa*)",
  "Read(id_ecdsa*)",
  "Read(id_ed25519*)",
  "Read(*.pem)",
  "Read(*.key)",
  "Read(*.p12)",
  "Read(*.pfx)",
  "Read(*.jks)",
  "Read(*.keystore)",
  "Read(*.tfstate)",
  "Read(*.tfstate.*)",
  "Read(*.tfvars)",
  "Read(*.tfvars.json)",
  "Read(*service-account*.json)",
  "Read(secrets/**)",
  "Read(.ssh/**)",
  "Read(.aws/**)",
  "Read(.azure/**)",
  "Read(.gcloud/**)",
  "Read(.gnupg/**)"
],
"ask": [
  "Bash(git push *--force*)",
  "Bash(git push -f*)",
  "Bash(git push * -f*)",
  "Bash(git push * +*)",
  "Bash(git reset --hard*)",
  "Bash(git clean *)",
  "Bash(git checkout -- *)",
  "Bash(git filter-branch*)",
  "Bash(rm -r*)",
  "Bash(rm -R*)",
  "Bash(rm -fr*)",
  "Bash(rm -fR*)",
  "Bash(rm * -r*)",
  "Bash(rm * -R*)",
  "Bash(rm *--recursive*)"
]
```

Keep the `!.env.example`-style lines **after** `Read(.env.*)`. A `!` rule only
carves exceptions out of rules listed before it.

## Check that it works

In the project, start Claude Code and ask it to read `.env` (create a dummy one
with a fake value first). It should report that the read is denied. Then ask it
to run `git push --force` on a scratch branch: it should ask you first instead
of running it.

## Limits

- Bash rules match the command text Claude writes, not the program it runs.
  The Claude Code docs say a Bash deny or ask rule "isn't a security boundary
  around the program". For a hard boundary on files and network, enable
  [sandboxing](https://code.claude.com/docs/en/sandboxing).
- `ask` on `rm -r…` also prompts for routine cleanup such as `node_modules`.
  That is intended; answer once per command.
