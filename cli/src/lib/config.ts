import { CONFIG_PATH, DEFAULT_CONFIG } from "./defaults.js";

import YAML from "yaml";
import fs from "fs";
import child_process from "child_process";
import inquirer from "inquirer";
import { cyan } from "./colour.js";
import { executeCmd } from "./scriptExecutors/$cmd.js";

type Config = {
  env: any;
  scripts: any;
};

type Env = {
  [key: string]: any;
};

type ResolvedEnv = {
  [key: string]: string;
};

type StdinResponses = {
  [key: string]: string;
};

type Script = {
  $cmd?: string;
  $stdin?: string;
};

const isLeafNode = (script: any) => script && (script.$cmd || script.$stdin);

/**
 * Finds a script, given a path.
 */
export const findScript = async (
  config: Config,
  scriptPath: string[]
): Promise<[Script, string[]]> => {
  let script = config.scripts;
  const resolvedScriptPath: string[] = [];
  for (const path of scriptPath) {
    // find exact match
    if (script[path]) {
      resolvedScriptPath.push(path);
      script = script[path];
    } else {
      // try to find partial match

      // search by prefix
      const entries = Object.entries(script);
      const found = entries.filter(([key, value]) => key.startsWith(path));
      if (found.length === 1) {
        const foundKey = found[0][0];
        resolvedScriptPath.push(foundKey);
        script = found[0][1];
      }
    }
    // no match... prompt
  }
  while (!isLeafNode(script)) {
    if (
      typeof script === "undefined" ||
      script === null ||
      Object.keys(script).length === 0
    ) {
      const availableScripts = `\t- ${stringifyScripts(config).join("\t- ")}`;
      const scriptStr = scriptPath.join(" ");
      console.error(
        `No scripts found at path: ${scriptStr}\nDid you mean?\n${availableScripts}`
      );
      process.exit(1);
    }
    const choices = Object.keys(script);
    // TODO auto select if only one choice?
    await inquirer
      .prompt([
        {
          type: "list",
          name: "next",
          message: "Please select a script",
          default: choices[0],
          choices: choices,
        },
      ])
      .then((answers) => {
        resolvedScriptPath.push(answers.next);
        script = script[answers.next];
      });
  }
  console.log(cyan(`Using script: ${resolvedScriptPath.join(" ")}`));
  return [script, resolvedScriptPath];
};

/**
 * Generic wrapper around any executable "Script" object.
 * @param script
 * @param env
 */
export const executeScript = async (
  script: Script,
  env: ResolvedEnv
): Promise<void> => {
  if (script.$cmd) {
    executeCmd(script.$cmd, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
  }
};

/**
 * Gets a list of executable scripts.
 */
export const stringifyScripts = (config: Config): string[] => {
  const scripts: string[] = [];
  const walk = (obj: any, path: string[] = []) => {
    for (const key in obj) {
      if (key.startsWith("$")) {
        scripts.push(path.join(" "));
      } else {
        walk(obj[key], [...path, key]);
      }
    }
  };
  walk(config.scripts);
  return scripts;
};

export const parseConfig = (config: string, env?: any): Config => {
  return YAML.parse(config);
};

/**
 * Resolves an environment configuration.
 * @param config
 * @param env
 * @returns
 */
export const internalFindEnv = (
  config: Config,
  env: string = "default"
): [Env, string] => {
  // look for exact match
  if (config.env[env]) {
    console.log(cyan(`Using environment: ${env}`));
    return [config.env[env] as Env, env];
  }

  // if only one environment, always use that? No

  // search by prefix
  const envs = Object.entries(config.env);
  const found = envs.filter(([key, value]) => key.startsWith(env));
  if (found.length === 1) {
    const foundEnv = found[0][0];
    console.log(cyan(`Using environment: ${foundEnv}`));
    return [found[0][1] as Env, foundEnv];
  }

  const availableEnvs = envs.map(([key, value]) => `\t- ${key}`).join("\n");
  console.error(
    `Environment not found: ${env}\nDid you mean?\n${availableEnvs}`
  );
  process.exit(1);
};

/**
 * Resolves environment variables
 * @param environment
 * @returns
 */
const internalResolveEnv = async (
  environment: Env,
  stdin: StdinResponses = {}
): Promise<[ResolvedEnv, StdinResponses]> => {
  const resolvedEnv: ResolvedEnv = {};
  const stdinResponses = { ...stdin };
  for (const [key, value] of Object.entries(environment)) {
    // execute $cmd
    if (value && value.$cmd) {
      let newValue = executeCmd(value.$cmd);
      // remove trailing newlines
      newValue = newValue.replace(/(\r?\n)*$/, "");
      resolvedEnv[key] = newValue;
    }
    // fetch $stdin
    else if (value && value.$stdin) {
      // if we already have a response, use that
      if (stdin[key]) {
        resolvedEnv[key] = stdin[key];
      } else {
        await inquirer
          .prompt([
            {
              type: "text",
              name: key,
              message: value.$stdin,
              default: value.$default,
            },
          ])
          .then((answers) => {
            stdinResponses[key] = answers[key];
            resolvedEnv[key] = answers[key];
          });
      }
    } else {
      // otherwise, just return the value
      resolvedEnv[key] = value;
    }
  }
  // console.log("resolvedEnv", resolvedEnv);

  // const resolvedEnv = Object.fromEntries(entries) as ResolvedEnv;
  return [resolvedEnv, stdinResponses];
};

/**
 * Finds and resolves the environment.
 * @param config
 * @param environment
 * @returns
 */
export const resolveEnv = async (
  config: Config,
  environment: string = "default",
  stdin: StdinResponses = {}
): Promise<[ResolvedEnv, StdinResponses, string]> => {
  const [env, envName] = internalFindEnv(config, environment);
  const [resolvedEnv, stdinResponses] = await internalResolveEnv(env, stdin);
  return [resolvedEnv, stdinResponses, envName];
};

export const loadConfig = (): string => {
  let config;
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log(
      cyan(
        `No ${CONFIG_PATH} file found. Creating a sample to get your started...`
      )
    );

    config = YAML.stringify(DEFAULT_CONFIG);
    fs.writeFileSync(CONFIG_PATH, config, "utf-8");
  } else {
    config = fs.readFileSync(CONFIG_PATH, "utf-8");
  }
  return config;
};
