# 🪝🪝 @mountainpass/hooked (aka "j") 🪝🪝 <!-- omit in toc -->

- [Install](#install)
- [Why](#why)
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



# Install

```
npm i -g @mountainpass/hooked-cli
```

# Why

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

Use `--env` to specify the global environment/s you'd like to use. 
```sh
j --env <yourenv1,yourenv2,etc>
```

## Rerunnable commands

Here is some example output:
```sh
Using environment: default
? What is your name? Bob
? Please select a script say
? Please select a script hello
Found script: say hello
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

For detailed hooked configuration, [please read here](_CONFIG.md).

Impatient? Checkout the [`hooked.yaml`](hooked.yaml) config we use!

# Backlog

More [here](_BACKLOG.md).