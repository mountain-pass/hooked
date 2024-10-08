# Configuration <!-- omit in toc -->

[Back to Index](README.md)

- [Overview](#overview)
- [Recommended - Enable YAML schema to help editing](#recommended---enable-yaml-schema-to-help-editing)
  - [For VisualStudio:](#for-visualstudio)
- [Editing `hooked.yaml`](#editing-hookedyaml)
  - [`imports:` (optional)](#imports-optional)
  - [`plugin:` (optional)](#plugin-optional)
  - [`env:` (optional)](#env-optional)
  - [`scripts:` (optional)](#scripts-optional)
- [Environment Variables and Resolvers](#environment-variables-and-resolvers)
  - [`string` - Set the value of an environment variable](#string---set-the-value-of-an-environment-variable)
  - [`$ask` - Prompt the user for input](#ask---prompt-the-user-for-input)
  - [`$cmd` - Run a command](#cmd---run-a-command)
  - [`$path` - Write a file/folder](#path---write-a-filefolder)
  - [`$env` - Adds environment variables](#env---adds-environment-variables)
  - [`$jobs_serial` - Run multiple jobs, one after the other](#jobs_serial---run-multiple-jobs-one-after-the-other)
- [Conventions](#conventions)
- [Advanced Configuration](#advanced-configuration)
  - [Custom Docker Command](#custom-docker-command)
  - [Custom SSH Command](#custom-ssh-command)
  - [Custom NPM Command](#custom-npm-command)
  - [Custom Makefile Command](#custom-makefile-command)

# Overview

When run, the app needs a `hooked.yaml` file to get started.

By convention, it looks in the current working directory, or the user's home directory for this file. Alternatively, you can explicitly define it with the `--config` cli arg.

To get started, run `j --init`, to create a template `hooked.yaml` file.

You can manually edit the `hooked.yaml` file, to include whatever scripting options you want.

# Recommended - Enable YAML schema to help editing

Most decent editors support YAML schemas, which provides **validation**, **documentation** and **code completion** tooltips for your YAML configuration files.

## For VisualStudio:

1. Install the "YAML Language Support by Red Hat" plugin
2. Add the following snippet to either/or:
    1. User settings: `CMD + P` > `>Preferences: Open User Settings (JSON)`
    1. Workspace settings: `CMD + P` > `>Preferences: Open Workspace Settings (JSON)`

```
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/mountain-pass/hooked/main/cli/schemas/hooked.yaml.schema-v2.json": [
      "hooked*.{yml,yaml}",
    ]
  }
}
```

You should now have **validation**, **documentation** and **code completion** tooltips!

> **Troubleshooting:** Check the "PROBLEMS" tab for any errors. Alternatively, restart the plugins with `>Developer: Restart Extension Host` to pickup/apply changes.

# Editing `hooked.yaml`

The `hooked.yaml` file has the following four root elements:

## `imports:` (optional)

Specifies a `string[]` of file paths or http endpoints, of hooked configuration files. These files are (downloaded), loaded and merged into the current running configuration (in order).

**Notes**

- File paths support glob pattern matching.
- Relative file paths, are resolved from the `${HOOKED_DIR}`.
- Tilde paths, are replaced with the user's home directory.
- Paths ending with a question mark, are optional. And will not raise an error if missing.
- `https://` paths, will be downloaded, and resolved from the local cache.

Example:
```yaml
imports:
  - ./hooked-*.{yml,yaml}
  - ~/hooked-homedir.yaml
  - /tmp/hooked-optional.yml?
  - https://raw.githubusercontent.com/mountain-pass/hooked/main/hooked.yaml
```

## `plugin:` (optional)

Provides the ability to use built-in plugins. If the key is present, and the value is `true`, the plugin will be enabled.

The currently available plugins are:

- `icons` - (default: `true`) makes pretty icons to differentiate executable scripts vs groups.
- `abi` - (default: `false`) scans for `*.json` files, and imports the contract methods as scripts. [Configuration documentation](_ABI_PLUGIN.md).
- `makefile` - (default: `true`) scans for a `Makefile` file, and imports the named tasks as scripts.
- `npm` - (default: `true`) scans for a `package.json` file, and imports the named scripts as scripts.

Example:
```yaml
plugin:
  npm: true
```

## `env:` (optional)

Globally defined environment variables, which can be referenced inside `scripts`.

  - `<EnvironmentName>:` - the name of a environment (active when matches the `--env` parameter).
    - `<EnvironmentVariable>:` - the name of an environment variable to set. It can have any [Environment Resolver](#environment-variables-and-resolvers) as a value.

> NOTE: Environment variables that have the word `SECRET` in the name, will be treated as a secret value.
> This means it's value will only be used for resolution. It will not be added to Shell or Docker scripts.

Example:
```yaml
env:
  test:
    SECRET_PASSWORD: jellybeans
  production:
    SECRET_PASSWORD: fluffydog
    USER:
      $cmd: echo "root"
```

## `scripts:` (optional)

Organises `$cmd` objects, into a named hierarchy.

The `scripts` object takes any number of child descendant objects, using the `key` as the script path.

The object's descendant values, must eventually end with a [`$cmd`](#cmd) or [$path](#path) objects - which allows the user to execute a predefined script.

How deep can you go? **As deep as you want!** (Note: Let me know if you hit a limit)

**Example:**

```yaml
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
  print a message containing input from the user (this is a valid name!) ✅✅✅:
    $env:
      GREETING: Hello
      NAME:
        $ask: What is your name?
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

# Environment Variables and Resolvers

Environment variables can be defined in three places:

1. operating system - OS environment variables are accessible at a global level
2. the root `env:` block - defines named groups of environment variables, which are accessible at a global level (*when enabled)
3. as an `$env:` field - provided as a sibling element to `$cmd` (under the root element `scripts:`), this allows defining environments at a per `$cmd` level.

All environment variables need to resolve to key `string` and value `string` pair.

In order to support more complicated resolution scenarios, we've provided the following three resolvers:

1. [`string`](#string)
2. [`$ask`](#stdin)
3. [`$cmd`](#cmd)
4. [`$path`](#path)
5. [`$env`](#env)
6. [`$jobs_serial`](#jobs_serial)

## `string` - Set the value of an environment variable

> Used for: Environment Variables

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

## `$ask` - Prompt the user for input

> Used for: Environment Variables

Requests input from the user.

**Parameters:**

- `$ask` - (`string`) the prompt to ask the user.
- `$default` - (`string` - optional) the default value to present to the user.
- `$choices` - (`string[]` | `EnvironmentResolver` | `string` (JSON array) | `string` (newline delimited) - optional) a list of choices to ask the user. If not provided, user is prompted to enter freetext.
  - `EnvironmentResolver` - any [EnvironmentResolver](#environment-variables-and-resolvers) can be provided as child.
  - If a JSON string is provided which resolves to an array of objects, a choice will be provided for each object
  - Otherwise, a newline delimited string will be used (one option per line)
- `$fieldsMapping` - (`{name: string, value: string}` - optional) - for JSON arrays that don't have `name` & `value` keys, please provide a fieldname mapping. Also accepts [JSONPath expressions](https://github.com/dchester/jsonpath).
- `$filter` - (`string` (regex) - optional) - filters `name` options
- `$sort` - ("alpha" | "alphaDesc" - optional) - sort alphabetically by `name` (default no sort) 

**Example:**

```yaml
env:
  default:
    FAV_COLOUR:
      $ask: Please choose a colour
      $default: blue
      $choices:
        $cmd: curl https://somejsonendpoint.com/getPastelColours
      $fieldsMapping:
        name: description
        value: id
      $filter: /.*red.*/i
      $sort: alpha
```

## `$cmd` - Run a command

> Used for: Environment Variables or Scripts

Resolves to the output of the command.

Throws an error if command exits with a non-zero status code.

Throws an error if an environment variable is missing i.e. `${..}`.

**Parameters:**

- `$cmd` - (`string`) The command to run. Supports multiline.
- `$image` - (`string` - optional) If supplied, command will execute in this docker image container.
- `$ssh` - (`string` - optional) If supplied, command will execute in this remote server.
- `$env` - (`object` - optional) Additional environment variables to resolve (added to global environment). (Resolved before `$envNames`)
- `$envNames` - (`string[]` - optional) Additional environment group names to resolve ONLY when executing this command.
- `$envFromHost` - (`string`) - If `true`, includes all environment variables from the host machine. (`true` by default for non-`$ssh` and non-`$image` commands.
- `$errorMessage` - (`string` - optional) An error message to display, when the `$cmd` exits with a non-zero exit code.

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
- you can update the `PATH` environment variable.
- you can utilise a container service like Docker to run custom language scripts.
- you can specify a shell to use, by using `#!/bin/sh -ve` (verbose output & fail fast) on the first line.
- if you want a script to always pass, append ` || true` to the end of the failing line.

## `$path` - Write a file/folder

> Used for: Scripts

Writes a file/folder to the filesystem.

**Parameters:**

- `$path` - (`string`) Sets the file/folder location.
- `$content` - (`string`) Sets the contents of the file to match the string. If an object is provided, will attempt to serialise the content to match either Yaml or Json (using the file extension). If absent, treats the path as a folder. Content is utf-8.
- `$permissions` - (`string` - optional) Sets the read/write/execute access permissions on the file/folder.
- `$owner` - (`string[]` - optional) Sets the 'uid:gid' of the file/folder. (Note: must be numerical).
- `$image` - (`string` - optional) If supplied, file will be written in this docker image container.
- `$ssh` - (`string` - optional) If supplied, file will be written in this remote server.

**Example:**

```yaml
scripts:
  write_file:
    $path: /tmp/somedir/hello.txt
    $permissions: '644'
    $owner: '100:100'
    $content: Hello world!
    $ssh: bob@server.com
  write_directory:
    $path: /tmp/foo/bar
    $permissions: '755'
    $owner: '100:100'
```

## `$env` - Adds environment variables

> Used for: Scripts

Additional environment variables to resolve (added to global environment).

**Example:**

```yaml
scripts:
  setup_environment_variables:
    $env:
      GREETING: Hello
      TimeOfDay: Afternoon
```

## `$jobs_serial` - Run multiple jobs, one after the other

> Used for: Scripts

Allows running multiple, sequential jobs.

Environment variables will be accumulated, and passed on to future jobs.

Takes an array of any of the following parameters:

**Parameters:**

- (`string`) The script path to run.
- (`Script`) An executable script definition.

**Example:**

```yaml
scripts:
  run all jobs:
    $jobs_serial:
      - this_is_a_reference
      - bbb ccc
      - $cmd: echo all done!

  this_is_a_reference:
    $cmd: echo aaa

  bbb:
    cccddd:
      $cmd: echo bbbccc
```

# Conventions

Environment variables defined with curly braces e.g. `${SOME_VALUE}` will be checked before script execution, to verify that they are present. Environment variables referenced without curly braces e.g. `$SOME_VALUE` will still be resolved at runtime, but no validation will be performed that they are present.

The default environment name (if not specified with `--env`), is `default`.

# Advanced Configuration

## Custom Docker Command

`$image` is used for running `$cmd` commands in docker containers. To change the docker command used, provide a `DOCKER_SCRIPT` environment variable.

Here is an example, using the default command as a baseline. Note: the `${...}` variables are reserved, and are only resolved internally before execution.

```shell
DOCKER_SCRIPT='docker run -t --rm --network host --entrypoint "" --env-file "${envfile}" -w "${parent}" -v "${parent}:${parent}" --name ${dockerName} ${dockerImage} /bin/sh -c "chmod 755 ${filepath} && ${filepath}"'
```

## Custom SSH Command

`$ssh` is used for running `$cmd` commands in remote server. To change the SSH command used, provide a `SSH_SCRIPT` environment variable.

Here is an example, using the default command as a baseline. Note: the `${...}` variables are reserved, and are only resolved internally before execution.

```shell
SSH_SCRIPT='ssh -q -T "${user_at_server}" < "${filepath}"'
```

## Custom NPM Command

The `plugin: npm: true` plugin, will execute npm scripts. To change the command used, provide a `NPM_SCRIPT` environment variable.

Here is an example, using the default command as a baseline. Note: the `${...}` variables are reserved, and are only resolved internally before execution.

```shell
NPM_SCRIPT='npm run ${NPM_COMMAND}'
```

## Custom Makefile Command

The `plugin: makefile: true` plugin, will execute Makefile scripts. To change the command used, provide a `MAKE_SCRIPT` environment variable.

Here is an example, using the default command as a baseline. Note: the `${...}` variables are reserved, and are only resolved internally before execution.

```shell
MAKE_FILE='Makefile'
MAKE_SCRIPT='make -s -f ${MAKE_FILE} ${MAKE_COMMAND}'
```