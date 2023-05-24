# Backlog <!-- omit in toc -->

[Back to Index](README.md)

- [Done](#done)
- [Next](#next)
- [create files at given location (even remotely or in docker image)](#create-files-at-given-location-even-remotely-or-in-docker-image)
- [Workarounds](#workarounds)
- [Future](#future)
- [Descoped](#descoped)


# Done

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
- [x] ability to run in docker container `$image: node:lts-alpine`
- [x] ABI support
  - [x] ABI - discover json files with `{ abi: [...], address: '0xabc' }` up to a max depth of 5
  - [x] ABI - support view/non-payable functions (with args)
  - [x] ABI - support payable functions (requires wallet) => `env.PRIVATE_KEY`
  - [x] ABI - support historical function calls => `env.BLOCK_NUMBER`
  - [x] ABI - document options (e.g. `plugins: abi: true`)
- [x] support emoji followed by space as a script name prefix (ignored when using prefix matchers)
- [x] support auto adding emojis  🪝📁 `plugins: icons: true/false` to toggle (default: true)
- [x] should normalise (lowercase and diacritics) strings, when matching script names
- [x] swap logging for LOG_LEVEL env var (info, debug, warn, error)
- [x] ensure ONLY script output is captured in the `j run > out.txt` - so jobs can be chained
- [x] add non-interactive `--batch` mode arg
- [x] handling of sensitive env vars -> include env groups specify per $cmd, only for that $cmd `$envIncludes: 'secretEnvGroup'`
- [x] support JSON as input for $choices (`$filter` / `$fieldsMapping` / `$sort`)
- [x] list environments
- [x] add relaxed json parsing for --stdin
- [x] support jsonpath in $fieldsMapping
- [x] append a `?` to indicate optional `imports:`
- [x] $cmd - add ability to show a custom error message for non-zero exits `$errorMessage` (+documentation, +unittests)
- [x] add custom warning just in time - if trying to run $image and docker is not available
- [x] add `npm` plugin (default true)
- [x] add `make` plugin (default true)

# Next

- [ ] allow `$cmd` only scripts to be specified as a string on the env key?
- [ ] create an `$ssh` augment for `$cmd`, similar to `$image` (use a `SSH_SCRIPT` for overriding)
- [ ] allow outside environment resolution in all `*_SCRIPTS`.

- [ ] document the `plugins` options
- [ ] `imports` > add checksum verification (similar to docker sha256)
- [ ] `imports` > add github.com (shorthand for https://raw.githubusercontent.com)
- [ ] `imports` > use etag to check if changed
- [ ] `scripts` > add regex search to cli and inapp selection - e.g. "build zip" => "build.*zip" => "build platform image to local zip"
- [ ] `$stdin` > check that defaults work for text and choices
- [ ] (cli args) > document reason we want `$stdin` option to be explicitly defined, and not just an environment variable

<!-- - [ ] precalc options if no env inputs? ?? <0 No idea wath this means -->
- [ ] add dynamic scripts for npm
- [ ] add ability to specify `requiredEnvNames: <ENV_NAME>: <string error message>`
- [ ] hooked.yaml version validation - yml: `version: >1.0.20`
- [ ] when run, warn if not the latest version
- [ ] update "rerun" command with inputs (JUST IN TIME, after $stdin resolution!) (in yellow!)
- [ ] teardown orphaned docker containers on SYSINT
- [ ] cleanup .env and .tmp on startup


# create files at given location (even remotely or in docker image)

- [x] allow overriding default docker run script
  - [x] build
  - [x] document
  - [ ] write unit test

- [ ] support openapi calls - e.g. https://api-engineering.nyc3.digitaloceanspaces.com/spec-ci/DigitalOcean-public.v2.yaml
- [ ] publish a yaml schema definition - e.g. # yaml-language-server: $schema=https://my.url.to/the/schema vs https://www.schemastore.org/json/
  
- [ ] dynamic exec paths - e.g. npm, makefile, abi files, openapi specs, etc
- [ ] if only one possible child path, prompt user to run it straight away
- [ ] secrets - best practice: don't import into environment, share a file instead
- [ ] secrets - parse output stream and obfuscate e.g. `***` if printed

- [ ] provide an example of a "poll until available" script
  - e.g. `curl --fail-with-body ...`

# Workarounds
- [ ] add a warning on homedir/import scripts if the chmod isn't `400` (optional)
- [ ] Inquirer > Press to continue -> important for destructive operations? (e.g. overwrite prod) (workaround: `read -p "Are you sure? " -n 1 -r`)

# Future
- [ ] ability to dyanmically fetch the next script's children
- [ ] styling
  - [ ] Add description
  - [ ] Add colour (edited)
  - [ ] Add emoji support
- [ ] Tty handling - show error message? (already handled?)
- [ ] Inquirer > Add autocomplete plugin
- [ ] Inquirer > Tree plugin
- [ ] Slack runner
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
- [ ] ~~secrets - make `$secret` envs, that are only imported explicitly for a single run~~ - No need for special top level env
- [ ] ~~add max limit of 1000 records to history~~ - No, simply truncate your own history e.g. `echo "$(tail -50 .hooked_history.log)" > .hooked_history.log`