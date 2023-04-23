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
- [x] support specifying multiple environments (comma delimited)
- [x] keep a history log (incl timestamp)
- [x] don't include process.env in the `--printenv`
- [x] throw error if $cmd is missing required environment variables
- [x] $stdin > $choices (include populate from $cmd etc)
- [x] env vars specific to the script being run
- [x] $imports - extend from other yaml configs
- [x] --init script (also happens if no config file)
  - [x] Create new config > "Blank"
  - [x] Create new config > "NPM"
  - [x] Create new config > from existing NPM (package.json)
- [x] run --init if no args supplied
- [x] No loop on list

# soon

- [ ] Inquirer > Press to continue -> important for destructive operations (e.g. overwrite prod)
- [ ] $imports > extend to support remote (http://) urls
- [ ] Pipelines

# error: Command failed: /Users/nickpersonal/mountain-pass/hooked/admin/.tmp.sh - but why?

# future
- [ ] $imports > extend $cmd to include a $cwd (current working directory e.g. relative to an imported script?)
- [ ] styling
  - [ ] Add description
  - [ ] Add colour (edited)
  - [ ] Add emoji support
- [ ] Tty handling - show error message? (already handled?)
- [ ] ~~Inquirer > Use the Inquirer - "Defaults" parameter~~ - already have this behaviour
- [ ] Inquirer > Add autocomplete plugin
- [ ] Inquirer > Tree plugin
- [ ] ~~Inquirer > Exit option -> Interrupted plugin (esc to quit)~~ just use ctrl+c
- [ ] Slack runner
- [ ] publish a yaml schema definition?
- [ ] change `-in` from json to `-in key=val key2=val2` (var args causes clashes with script targets)
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

# descoped
- [ ] ~~$inject - inject yaml from a file~~ - nah, just use the $imports instead
  - [ ] ~~local~~
  - [ ] ~~remote (e.g. `extends: https://myserver/foo.yaml`)~~
  - [ ] ~~global settings under user profile > env vars~~
- [ ] ~~leverage existing scripts~~
  - [ ] ~~Npm~~ - nah, just use hooked instead!
  - [ ] ~~Makefile~~ - nah, just use hooked instead!
  - [ ] ~~auto detect child folders with hooked.yaml?~~ - nah, just use the $import feature instead!
- [ ] ~~Input type > Remote (e.g. rest api)~~ - just use $cmd to populate inputs (one line per choice)
- [ ] ~~$javascript - e.g. Math.max(10, ${DATE})~~ - just use docker and/or $cmd
- [ ] ~~have "shared" environment variables (env agnostic)~~ just use multi environments
- [ ] ~~--init script > Create new config > "Docker"~~ if standardised, this could be a remote file
- [ ] ~~--init script > Create new config > $HOME/hooked.yaml~~ left to the user to setup
- [ ] ~~--init script > Create new config > from existing Makefile~~ too obscure, wait until desired before creating