# @mountainpass/hooked (aka "j")

# rationale

I want to be able to setup advanced build server scripts, that can be run:
- by anyone
- anywhere (locally & remotely)
- anytime
- behave consistently

## alternatives

|tool|cons|pros|
|---|---|---|
| NPM | primarily a package manager, scripting changes affects build caching, scripting has to be escaped | has access to self install cli tools|
| Makefile | ugly, non intuitive and feels brittle | has been around forever |
| Javascript | very verbose, can't switch to native shell easily | cross platform|

# install

```
npm i -g @mountainpass/hooked-cli
```

# usage

Just type `j`, and it'll help setup a sample `hooked.yaml` config file!
```
j -h
```
(it's a fishing hook)

# configuration

_coming soon_

# now
- [x] can run scripts based on yaml paths
- [x] can run scripts based on yaml path prefixes
- [x] can prompt user if path not complete
- [x] can prompt for env from stdin (allow providing defaults)
- [x] prompt user with a "replayable" script
- [x] external env var prerequisites (e.g. must have ZIPDROP_V3_BEARER_TOKEN)
- [x] env vars -> resolving env vars
- [ ] global settings under user profile > env vars

# future
- [ ] change `-in` from json to `-in key=val key2=val2`
- [ ] global settings > username
- [ ] if only one possible child path, runs it straight away
- [ ] keep history and timestamp
- identity, in history, use for ssh key gen and approval
- permissions
- run remotely (e.g. on build server, esp for gated access)
- concept of `prerequisites` (e.g. must have 'node' installed, or $cmd must exit with 0)
- add more executors (e.g. javascript?)
- use remote includes (e.g. `extends: https://myserver/foo.yaml`)
- run in docker container (ala docker-shell) `container: node:lts-alpine`
- opt to list all commands
- opt to list resolved env
- hide debug output behind an opts
  