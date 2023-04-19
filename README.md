# @mountainpass/hooked (aka "j")

# rationale

I want to be able to setup advanced build server scripts, that can be run:
- by anyone
- anywhere (locally or remotely)
- anytime

When executing the scripts, it must be:
- consistent
- intuitive
- forgiving
- suggestive
- simple

## alternatives

|tool|cons|pros|
|---|---|---|
| NPM | primarily a package manager, scripting changes affects build caching, scripting has to be escaped | has access to self install cli tools|
| Makefile | ugly, non intuitive, feels brittle, not bash, funny env resolution | has been around forever |
| Javascript | very verbose, can't switch to native shell easily | cross platform|

# install

```
npm i -g @mountainpass/hooked-cli
```

# usage

```sh
j --help
```
(the 'j' is a fishing hook!)

Just type `j`, and it'll setup a sample `hooked.yaml` config file. It will then prompt you for inputs!
```sh
j
```

Example output, after selecting options:
```sh
Using environment: default
? What is your name? Bob
? Please select a script say
? Please select a script hello
Using script: say hello
rerun: j say hello -e default -in '{"FIRSTNAME":"Bob"}'
Hello world, Bob (nickpersonal)!
git commit is -> (279e8b9)
```

Note the `rerun: ...` output? You can use that, to rerun a command, with all inputs predefined:
```sh
j say hello --env default --stdin '{"FIRSTNAME":"Bob"}'
```

Don't worry, if you can't remember the full script path, you'll be prompted. Try this:
```sh
j say
```

Feeling ~~lazy~~ efficient? Try typing some characters of the script or environment. As long as it's enough to uniquely identify your script, the tool will do the rest!
```sh
j s hel --env sp
```

Don't forget to commit `hooked.yaml` to source control, for the next person!

# configuration

Please see the [`hooked.yaml`](hooked.yaml) example.

_More coming soon._

# now
- [x] can run scripts based on yaml hierarchy
- [x] can run scripts based on yaml hierarchy (using prefixes)
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
- [ ] identity, in history, use for ssh key gen and approval
- [ ] permissions
- [ ] run remotely (e.g. on build server, esp for gated access)
- [ ] concept of `prerequisites` (e.g. must have 'node' installed, or $cmd must exit with 0)
- [ ] add more executors (e.g. javascript?)
- [ ] use remote includes (e.g. `extends: https://myserver/foo.yaml`)
- [ ] run in docker container (ala docker-shell) `container: node:lts-alpine`
- [ ] opt to list all commands
- [ ] opt to list resolved env
- [ ] hide debug output behind an opts
- [ ] non-interactive mode?