# Configuration <!-- omit in toc -->

[Back to Index](README.md)

- [Overview](#overview)
- [Environment Resolvers](#environment-resolvers)
  - [`string`](#string)
  - [`$cmd`](#cmd)
  - [`$stdin`](#stdin)
- [Scripts](#scripts)
- [Conventions](#conventions)

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

# Environment Resolvers

All environment variables consist of a key `string` and a value `string`. We've provided basic and custom resolvers, to support more complicated value-resolution scenarios.

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

- `$cmd` - (`string`) the command to run.
- `$image` - (`string` - optional) the docker command to run the command in.
- `$env` - (`object` - optional) additional environment variables to resolve, before running this script.

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
- `$choices` - (`string[]` or `object` - optional) a list of choices to ask the user. If not provided, user is prompted to enter freetext.
  - `object` - any [Environment Resolver](#environment-resolvers) can be provided as child. A choice will be provided for each newline delimited string.

**Example:**

```yaml
env:
  default:
    FAV_COLOUR:
      $stdin: Please choose a colour
      $default: blue
      $choices:
        - blue
        - red
        - green
```

# Scripts

The `scripts` object takes any number of child descendant objects, using the `key` hierarchy as the script path.

The objects should eventually end in a [`$cmd`](#cmd) object, which allows the user to execute a predefined script.

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
  print a message containing input from the user (this is valid!):
    $env:
      NAME:
        $stdin: What is your name?
        $default: I don't know my name
    $cmd: echo Hello ${NAME}
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