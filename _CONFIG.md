# Configuration <!-- omit in toc -->

[Back to Index](README.md)

- [Overview](#overview)
- [Environment Variables (and Resolvers)](#environment-variables-and-resolvers)
  - [`string`](#string)
  - [`$cmd`](#cmd)
  - [`$stdin`](#stdin)
- [Scripts](#scripts)
- [Conventions](#conventions)
- [Advanced Configuration](#advanced-configuration)
  - [Custom Docker Command](#custom-docker-command)

# Overview

When run, the app looks for a `hooked.yaml` file in the current working directory.

The configuration has three top level items:

- `imports:` - (optional) takes a `string[]` of file paths. These files are loaded and merged with the current file, in order.

- `env:` - (optional) takes an `object`.
  - `<environmentName>:` - the name of a pre-configured environment (active when matches the `--env` parameter).
    - `<environmentVariableKey>:` - the name of an environment variable to set. It can have any [Environment Resolver](#environment-resolvers) as a value.

- `scripts:` - (optional) takes an `object` ([see Scripts](#scripts)).

*Example: hooked.yaml*

```yaml
imports:
  - ./_admin.yaml
  - ./_mongo.yaml

env:
  default:
    MONGO_URL: ${MONGO_URL_PROD_READONLY}

scripts:
  mongobackup_prod:
    $cmd: |
        #!/bin/sh -ve
        echo "Backing up database..."
        # ... code to backup db ...
```

# Environment Variables (and Resolvers)

Environment variables can be defined in three places:

1. operating system - OS environment variables are accessible at a global level
2. the root `env:` block - defines named groups of environment variables, which are accessible at a global level (*when enabled)
3. as an `$env:` field - provided as a sibling element to `$cmd` (under the root element `scripts:`), this allows defining environments at a per `$cmd` level.

All environment variables need to resolve to key `string` and value `string` pair.

In order to support more complicated resolution scenarios, we've provided the following three resolvers:

1. [`string`](#string)
2. [`$cmd`](#cmd)
3. [`$stdin`](#stdin)

## `string`

Resolves to a plain text string.

Resolves any `${..}` environment variables within the string.

Throws an error if an environment variable is missing. Can be used to enforce presence of variables.

**Parameters:**

- _Not applicable_

**Example:**

```yaml
env:
  default:
    WELCOME_MESSAGE: Hello there ${USER}!
    NAME: ${USER}
```

## `$cmd`

Resolves to the output of the command.

Throws an error if command exits with a non-zero status code.

Throws an error if an environment variable is missing i.e. `${..}`.


**Parameters:**

- `$cmd` - (`string`) The command to run. Supports multiline.
- `$image` - (`string` - optional) If supplied, command will execute in this docker image container.
- `$env` - (`object` - optional) Additional environment variables to resolve (added to global environment). Resolved before `$envNames`.
- `$envNames` - (`string[]` - optional) Additional environment group names to resolve ONLY when executing command. Resolved after `$env`.

**Example:**

```yaml
env:
  default:
    WELCOME_MESSAGE:
      $cmd: echo Hello world!
    ANOTHER_MESSAGE:
      $cmd: |
        #!/bin/sh -ve
        echo Hello world!
```

**Tips:**

- you can use multiline string for a longer script.
- you can update the `PATH` env var to use custom scripts.
- you can utilise a container service like Docker to run custom language scripts.
- you can specify a shell to use, by using `#!/bin/sh -ve` (verbose output & fail fast) on the first line.
- if you want a script to always pass, append ` || true` to the end of the failing line.

## `$stdin`

Requests input from the user.

**Parameters:**

- `$stdin` - (`string`) the prompt to ask the user.
- `$default` - (`string` - optional) the default value to present to the user.
- `$choices` - (`string[]` | `EnvironmentResolver` | `string` (JSON array) | `string` (newline delimited) - optional) a list of choices to ask the user. If not provided, user is prompted to enter freetext.
  - `EnvironmentResolver` - any [EnvironmentResolver](#environment-resolvers) can be provided as child.
  - If a JSON string is provided which resolves to an array of objects, a choice will be provided for each object
  - Otherwise, a newline delimited string will be used (one option per line)
- `$fieldsMapping` - (`{name: string, value: string, short?: string}` - optional) - for JSON arrays that don't have `name` & `value` keys, please provide a fieldname mapping.
- `$filter` - (`string` (regex) - optional) - filters `name` options
- `$sort` - ("alpha" | "alphaDesc" - optional) - sort alphabetically by `name` (default no sort) 

**Example:**

```yaml
env:
  default:
    FAV_COLOUR:
      $stdin: Please choose a colour
      $default: blue
      $choices:
        $cmd: curl https://somejsonendpoint.com/getPastelColours
      $fieldsMapping:
        name: description
        value: id
      $filter: /.*red.*/i
      $sort: alpha
```

# Scripts

The `scripts` object takes any number of child descendant objects, using the `key` hierarchy as the script path.

The objects should eventually end in a [`$cmd`](#cmd) object (with an optional `$env` sibling!), which allows the user to execute a predefined script.

How deep can you go? **As deep as you want!** (Note: Let me know if you hit a limit)

**Example:**

```yaml
env:
  default:

scripts:
  say:
    hello:
      in_spanish:
        $cmd: echo Hola!
      in_english:
        $cmd: echo Hello!
  do:
    something:
      nested:
        very:
          deep:
            $cmd: echo Woohoo!
  + print a message containing input from the user (this is a valid name!) ✅✅✅:
    $env:
      GREETING: Hello
      NAME:
        $stdin: What is your name?
        $default: I don't know my name
    $cmd: echo ${GREETING} ${NAME}!
````

These could be run, using:

```sh
j say hello in_spanish
# or
j d s n v d
# or
j "print a mess"
```

# Conventions

Environment variables are always defined with curly braces e.g. `${SOME_VALUE}`.

The default environment name (if not specified with `--env`), is `default`.

# Advanced Configuration

## Custom Docker Command

`$image` is used for running `$cmd` commands in docker containers. To change the docker command used, provide a `DOCKER_SCRIPT` environment variable.

Here is an example, using the default command as a baseline. Note: the `${...}` variables are reserved, and are only resolved internally before execution.

```yaml

env:
  default:
    DOCKER_SCRIPT: docker run -t --rm --network host --entrypoint "" --env-file "${envfile}" -w "${parent}" -v "${parent}:${parent}" ${dockerImage} /bin/sh -c "chmod 755 ${filepath} && ${filepath}"
```