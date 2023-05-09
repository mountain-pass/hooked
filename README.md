# 🪝🪝 @mountainpass/hooked (aka "j") 🪝🪝 <!-- omit in toc -->

- [Install](#install)
- [Rationale](#rationale)
  - [Existing tools](#existing-tools)
- [Usage](#usage)
  - [Getting started](#getting-started)
  - [Preconfigured environments](#preconfigured-environments)
  - [Rerunnable commands](#rerunnable-commands)
  - [Copy other people](#copy-other-people)
  - [Suggested scripts](#suggested-scripts)
  - [Smart complete scripts](#smart-complete-scripts)
- [Configuration](#configuration)
- [Backlog](#backlog)
  - [Done](#done)
  - [Next](#next)
  - [Workarounds](#workarounds)
  - [Future](#future)
- [Descoped](#descoped)



# Install

```
npm i -g @mountainpass/hooked-cli
```

(If cached, you may need to specify `--prefer-online --force`)

# Rationale

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

## Existing tools

|🔨 tool 🔨|🚨 cons 🚨|✅ pros ✅|
|---|---|---|
| NPM | <ul><li>not cli discoverable</li><li>primarily a package manager</li><li>scripting changes affects (docker) build caching</li><li>scripting has to be escaped (json)</li><li>cannot do multiline scripts</li></ul> | <ul><li>has access to self install cli tools</li></ul> |
| Makefile | <ul><li>not cli discoverable</li><li>ugly</li><li>non intuitive</li><li>feels brittle</li><li>not bash</li><li>odd env resolution behaviour</li></ul> | <ul><li>familiarity amonst seasoned devs</li></ul> |
| Javascript | <ul><li>needlessly verbose</li><li>can't switch to native shell easily</li></ul> | <ul><li>cross platform</li></ul> |
| Shell Scripts | <ul><li>not cli discoverable</li><li>have to jump between files</li><li>not cross platform</li></ul> | <ul><li>familiarity</li></ul> |

I want something simpler and more easy to use...

✅ pros of hooked ✅
- **less context switching** - one file for all scripts (or multiple, choose your own adventure!).
- **more readable** - because of "smart" completion, script names can be more verbose (symbols!).
- **less environment configuration** - only required environment variables are resolved, meaning non-admins don't need a full environment setup.
- **more extensible** - supports more generic, reusable, parameterised scripts.
- **less typing** - using `j _logs_`, users can rebuild/redeploy (almost) handsfree.
- **scripts reuse** - scripts that call other scripts = easy pipelines.
- **scripts for documentation** - scripts can print out information, or be used to open websites e.g. `open https://somewebsite.com`

# Usage

```sh
j --help
```
(the 'j' is a fishing hook!)

---

## Getting started

Just type `--init`, and it'll ask to choose a sample `hooked.yaml` config file to start with.
```sh
j --init
```

## Preconfigured environments

Use `--env` to specify the environment/s you'd like to use. 
```sh
j --env <yourenv1,yourenv2,etc>
```

## Rerunnable commands

Here is some example output, with the `--debug` option:
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

## Copy other people

Similar to the `rerun` output, you can see (and copy) what others have run recently:
```
j --log
```

## Suggested scripts

Don't worry, if you can't remember the full script path, you'll be prompted. Try this:
```sh
j
```

## Smart complete scripts

Feeling ~~lazy~~ efficient? Try typing some prefix characters of the script or environment. As long as it's enough to uniquely identify your script, the tool will do the rest!

*Example: shorthand for run "say hello --env spanish*
```sh
j s hel --env sp
```

---

Don't forget to commit `hooked.yaml` and `.hooked_history.log` files to source control, for the next person!

# Configuration

This deserves it's own section... [check it out](_CONFIG.md).

Impatient? Checkout the [`hooked.yaml`](hooked.yaml) config we use!

# Backlog

## Done

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
- [x] hide debug output behind an opts
- [x] consolidate `string`, `$env` and `$resolve` to behave the same way (`$env` is a clash!)
- [x] replay last command / replay from log using `_log_` option
- [x] $imports > extend to support remote (https://) urls (and a `--pull` option)

- [ ] dynamic exec paths - e.g. npm, makefile, abi files, etc
  - [x] ABI - discover json files with `{ abi: [...], address: '0xabc' }` up to a max depth of 5
  - [x] ABI - support no args + view/non-payable functions
  - [x] ABI - support args + view/non-payable functions
  - [ ] ABI - support payable functions (requires wallet)
  - [ ] ABI - document options (e.g. `plugins: abi: true`)

## Next

- [ ] run natively in docker container (ala docker-shell) `container: node:lts-alpine` - 
  - [ ] Con: don't want to introduce dependencies, docker may not be present
  - [ ] Pro: it is super important to have consistent behaviour

- [ ] secrets - make `$secret` envs, that are only imported explicitly for a single run
  - [ ] `$secrets: <envName>: FOO=bar` - secrets, that are only supplied when explicitly requested
  - [ ] `$scripts: ...: $cmd: $secrets: <envName>` - make specific only to that `$cmd`
  - [ ] Pros: currently environment variables are shared with all scripts by default. We don't want that for sensitive information.

- [ ] if only one possible child path, prompt user to run it straight away
- [ ] secrets - best practice: don't import into environment, share a file instead
- [ ] secrets - parse output stream and obfuscate e.g. `***` if printed

- [ ] provide an example of a "poll until available" script
  - e.g. `curl --fail-with-body ...`

## Workarounds
- [ ] add a warning on homedir/import scripts if the chmod isn't `400` (optional)
- [ ] show parent script folders are expandable, as opposed to script leaf nodes - workaroud: manually prepend a `+` character
- [ ] Inquirer > Press to continue -> important for destructive operations (e.g. overwrite prod) (workaround: `read -p "Are you sure? " -n 1 -r`)

## Future
- [ ] styling
  - [ ] Add description
  - [ ] Add colour (edited)
  - [ ] Add emoji support
- [ ] Tty handling - show error message? (already handled?)
- [ ] Inquirer > Add autocomplete plugin
- [ ] Inquirer > Tree plugin
- [ ] Slack runner
- [ ] publish a yaml schema definition?
- [ ] global settings > username or ssh key
- [ ] identity, in history, use for ssh key gen and approval
- [ ] permissions (only really enforcable on server)
- [ ] run remotely (e.g. on build server, esp for gated access)
- [ ] concept of `prerequisites` (e.g. must have 'node' installed, or $cmd must exit with 0)

# Descoped
- [ ] ~~$inject - inject yaml from a file~~ - nah, just use the $imports instead
  - [ ] ~~local~~
  - [ ] ~~remote (e.g. `extends: https://myserver/foo.yaml`)~~
  - [ ] ~~global settings under user profile > env vars~~
- [ ] ~~leverage existing scripts~~
  - [ ] ~~Npm~~ - nah, just use hooked instead!
  - [ ] ~~Makefile~~ - nah, just use hooked instead!
  - [ ] ~~auto detect child folders with hooked.yaml?~~ - nah, just use the $import feature instead!
- [ ] ~~Input type > Remote (e.g. rest api)~~ - just use $cmd to populate inputs (one line per choice)
- [ ] ~~javascript - e.g. Math.max(10, ${DATE})~~ - just use docker and/or $cmd
- [ ] ~~add more executors (e.g. javascript?)~~ - nah, user can just leverage a container or cli tool (same as above)
- [ ] ~~have "shared" environment variables (env agnostic)~~ just use multi environments
- [ ] ~~--init script > Create new config > "Docker"~~ if standardised, this could be a remote file
- [ ] ~~--init script > Create new config > $HOME/hooked.yaml~~ left to the user to setup
- [ ] ~~--init script > Create new config > from existing Makefile~~ too obscure, wait until desired before creating
- [ ] ~~Inquirer > Use the Inquirer - "Defaults" parameter~~ - already have this behaviour
- [ ] ~~Inquirer > Exit option -> Interrupted plugin (esc to quit)~~ just use ctrl+c
- [ ] ~~opt to list all commands~~ - unnecessary, can already prompt user
- [ ] ~~non-interactive mode?~~
- [ ] ~~opt to select env names? (as opposed to having a default)~~
- [ ] ~~change `-in` from json to `-in key=val key2=val2` (var args causes clashes with script targets)~~
- [ ] ~~$imports > extend $cmd to optionally specify a $cwd (current working directory e.g. relative to an imported script?)~~ - tricky, any imported file *should* parameterise this, or be agnostic of dir
- [ ] ~~Pipelines~~ - couldn't that just use a script?
- [ ] ~~consolidate `env` and `stdin` ?~~ - No - stdin must be a separate output, so that jobs can be replayed
  