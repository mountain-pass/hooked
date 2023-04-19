![Fishing Hook by Adi Dizdarevic from the Noun Project](./src/web/images/fishhook.png "Fishing Hook by Adi Dizdarevic from the Noun Project")

# hooked

*A tool for executing preconfigured scripts via multiple channels (e.g. REST, CLI, WEB).*

- [hooked](#hooked)
- [Installation](#installation)
- [Server Usage](#server-usage)
- [Command Line Interface](#command-line-interface)
- [Web Interface](#web-interface)
- [TODO](#todo)
    - [CLI](#cli)
    - [Server](#server)
    - [Server Website](#server-website)
- [Attributions](#attributions)

# Installation

```
npm install -g mountain-pass/hooked
```

# Server Usage

```
jserver
```

**Developers:** To run the source code locally (with live reload)...

```
npm install
npm start
```

# Command Line Interface

```
j
```

**Developers:** To run the source code locally...

```
./cli.js
```

![Hooked - Example Command Line Interface](./src/web/images/hooked-example.gif "Hooked - Example Command Line Interface")

# Web Interface

![Hooked - Example Web Interface](./src/web/images/web-example.png "Hooked - Example Web Interface")

# TODO

## CLI

- [ ] allow non-interactive command input -> workaround: use curl and rest
- [ ] use auth/https certs to verify client <-> server security
- [ ] allow chaining hooks
- [ ] adding hook - validate hook has a name
- [ ] allow local execution of scripts? (security impl?)
- [ ] allow auto discovery of servers
- [ ] support different types of hooks?
- [ ] allow continuous input mode
- [ ] log "REST/CURL" equivalents of running commands
- [ ] Create a DSL? a la Fastlane
- [ ] allow multi server configuration e.g. `export HOOKED_SERVER=http://foobar:4000,http://catdog:3000`
- [x] ~~allow server configuration~~ :arrow_right: `export HOOKED_SERVER=http://foobar:4000`
- [x] ~~"rename" hook~~
- [x] ~~order list options alphabetically~~
- [x] ~~"createSlackNotificationHook"~~

## Server

- [ ] move user prompts config into server - expand inquirer params - description/help, cardinality, prompt, defaultValue, etc
- [ ] :bangbang: allow updating/editing hooks & metadata (e.g. version, description, supported os, last modified, etc)
- [ ] check whether hook command is "supported" e.g. curl --help && echo $? == 0
- [ ] create job to view job config
- [ ] setup a Docker job
- [ ] setup a Steam job
- [ ] setup an AWS job
- [ ] setup an Azure job
- [ ] metadata - add "support" fields
    - [ ] supported until
    - [ ] details of support contract
    - [ ] warnings when unsupported/out of support
- [ ] support service versioning
    - [ ] multiple version running at same time?
    - [ ] strict version vs semantic versioning?
    - [ ] include version in http headers (for client as well) - @Tom - what do you recommend? (https://github.com/Microsoft/aspnet-api-versioning/issues/42)
- [ ] add auditing (requires user auth?)
- [ ] flag to disable internal/admin hooks?
- [ ] add ability to schedule hooks
- [ ] :exclamation: stop "injection" attacks
- [ ] save config - debounce
- [ ] make hooks a navigable hierarchy?
- [ ] add tests
- [ ] git version control static config?
- [x] ~~implement http caching - etag~~
- [x] ~~handle when backend server is down~~
- [x] ~~add icons to hooks~~
- [x] ~~disable livereload for non-dev environments~~ :arrow_right: `export LIVERELOAD=true`
- [x] ~~add metadata to services~~
- [x] ~~write configuration to a user configurable location~~
- [x] ~~read configuration from a user configurable location~~ :arrow_right: `export HOOKED_HOME=/Users/nickpersonal/.hooked`
- [x] ~~allow external configuration of server port~~ :arrow_right: `export HOOKED_SERVER_PORT=4000`
- [x] ~~:exclamation: create a web frontend~~ :arrow_right: [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Server Website

- [ ] mobile - put hook buttons into a dropdown?
- [ ] create a component for http loading?
- [ ] add "external" access to select hooks via a web interface
- [ ] align colours (CLI with Website)
- [ ] ability to import hooks from external sources (marketplace? updates?)
- [ ] add validation
- [ ] todo componentise pug sections?
- [ ] provide sample curl commands?
- [x] ~~mobile supported display~~
- [x] ~~fix dropdown styling~~
- [x] ~~handle list inputs~~

# Attributions

[Fishing Hook](https://thenounproject.com/term/fishing-hook/194083/) (modified) by [Adi Dizdarevic](https://thenounproject.com/Dyya/) from the [Noun Project](https://thenounproject.com) - [CreativeCommons3.0](https://creativecommons.org/licenses/by/3.0/legalcode)