#!/usr/bin/env node
import { program } from "commander";
import {
  executeScript,
  findScript,
  loadConfig,
  parseConfig,
  resolveEnv,
} from "./lib/config.js";
import { cyan } from "./lib/colour.js";

const configStr = loadConfig();
const config = parseConfig(configStr);

program
  .name("hooked")
  .description("CLI execute preconfigured scripts")
  .version("1.0.0", "-v, --version")
  .option("-e, --env <env>", "specify environment", "default")
  .option("-in, --stdin <json>", "specify stdin responses", "{}")
  .argument("[scriptPath...]", "the script path to run")
  .usage("[options]")
  .action(async (scriptPath: string[], options) => {
    const stdin = JSON.parse(options.stdin);
    const [script, resolvedScriptPath] = await findScript(config, scriptPath);
    const [env, stdinResponses, resolvedEnvName] = await resolveEnv(
      config,
      options.env,
      stdin
    );
    console.log(
      cyan(
        `rerun: j ${resolvedScriptPath.join(
          " "
        )} -e ${resolvedEnvName} -in '${JSON.stringify(stdinResponses)}'`
      )
    );
    await executeScript(script, env);
  });

program.parse(process.argv);
