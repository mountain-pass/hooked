# @mountainpass/hooked (aka "j")

# rationale

I want to be able to setup advanced build server scripts, that can be run:
- by anyone
- with no project knowledge
- anywhere (locally or remotely)
- anytime

When executing the scripts, it must be:
- consistent
- intuitive
- forgiving
- suggestive
- simple

## existing options

|tool|cons|pros|
|---|---|---|
| NPM | <ul><li>not cli discoverable</li><li>primarily a package manager</li><li>scripting changes affects (docker) build caching</li><li>scripting has to be escaped (json)</li><li>cannot do multiline scripts</li></ul> | <ul><li>has access to self install cli tools</li></ul> |
| Makefile | <ul><li>not cli discoverable</li><li>ugly</li><li>non intuitive</li><li>feels brittle</li><li>not bash</li><li>odd env resolution behaviour</li></ul> | <ul><li>familiarity amonst seasoned devs</li></ul> |
| Javascript | <ul><li>needlessly verbose</li><li>can't switch to native shell easily</li></ul> | <ul><li>cross platform</li></ul> |
| Shell Scripts | <ul><li>not cli discoverable</li><li>have to jump between files</li><li>not cross platform</li></ul> | <ul><li>familiarity</li></ul> |

I want something simpler and more easy to use...

# install

```
npm i -g @mountainpass/hooked-cli
```

# usage

```sh
j --help
```
(the 'j' is a fishing hook!)

---

Just type `j`, and it'll setup a sample `hooked.yaml` config file. It will then prompt you for inputs!
```sh
j
```

---

New to a project or don't know where to start? See (and copy) what others have run recently:
```
j --log
```

---

Here is some example output, with the `--debug` option on:
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

---

Don't worry, if you can't remember the full script path, you'll be prompted. Try this:
```sh
j say
```

---

Feeling ~~lazy~~ efficient? Try typing some characters of the script or environment. As long as it's enough to uniquely identify your script, the tool will do the rest!
```sh
j s hel --env sp
```

---

Don't forget to commit `hooked.yaml` and `.hooked_history.log` files to source control, for the next person!

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
- [x] opt to list resolved env values
- ~~[ ] have "shared" environment variables (env agnostic)~~
- [x] support specifying multiple environments (comma delimited)
- [x] keep a history log (incl timestamp)
- [x] don't include process.env in the `--printenv`
- [x] throw error if $cmd is missing required environment variables
- [x] $stdin > $choices (include populate from $cmd etc)
- [x] env vars specific to the script being run

# soon
- [ ] $imports - extend from other yaml configs
- [ ] $javascript - e.g. Math.max(10, ${DATE}) - (can't we just use docker and $cmd?)
- [ ] $inject - inject yaml from a file
  - [ ] local
  - [ ] remote (e.g. `extends: https://myserver/foo.yaml`)
  - [ ] global settings under user profile > env vars
- [ ] leverage existing scripts
  - [ ] Npm
  - [ ] Makefile
  - [ ] Child folders with hooked.yaml?
- [ ] Pipelines
- [ ] Slack runner
- [ ] Input type > Remote (e.g. rest api)

# future
- [ ] publish a yaml schema definition?
- [ ] change `-in` from json to `-in key=val key2=val2`
- [ ] global settings > username
- [ ] if only one possible child path, runs it straight away
- [ ] identity, in history, use for ssh key gen and approval
- [ ] permissions
- [ ] run remotely (e.g. on build server, esp for gated access)
- [ ] concept of `prerequisites` (e.g. must have 'node' installed, or $cmd must exit with 0)
- [ ] add more executors (e.g. javascript?)
- [ ] run in docker container (ala docker-shell) `container: node:lts-alpine`
- [ ] opt to list all commands
- [ ] hide debug output behind an opts
- [ ] non-interactive mode?
- [ ] opt to select env names? (as opposed to having a default)