import * as _ from './HookedSchema'
import zodToJsonSchema, { type JsonSchema7Type } from 'zod-to-json-schema'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// console.log(JSON.stringify(toSchema(), null, 2))

/**
 * Generates a JSON schema from the Zod schema.
 */
export const toJsonSchema7Type = (): JsonSchema7Type => {
  return zodToJsonSchema(_.HookedSchema, {
    definitionPath: '$defs',
    definitions: {
      CronSchedule: _.CronSchedule,
      ScriptReference: _.ScriptReference,
      CronTrigger: _.CronTrigger,
      TriggersGroup: _.TriggersGroup,
      WritePathScript: _.WritePathScript,
      JobsSerialScript: _.JobsSerialScript,
      OldStdinScript: _.OldStdinScript,
      ScriptsGroup: _.ScriptsGroup,
      StdinChoicesValue: _.StdinChoicesValue,
      StdinFieldsMappingValue: _.StdinFieldsMappingValue,
      StdinScript: _.StdinScript,
      EnvironmentValue: _.EnvironmentValue,
      EnvironmentGroup: _.EnvironmentGroup,
      CmdScript: _.CmdScript,
      ServerAuth: _.ServerAuth,
      ServerUser: _.ServerUser,
      ServerDashboardSectionField: _.ServerDashboardSectionField,
      ServerDashboardSection: _.ServerDashboardSection,
      ServerDashboard: _.ServerDashboard,
      Server: _.Server
    }
  })
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
console.log(`currentDir: ${currentDir}`)

fs.writeFileSync(
  path.join(currentDir, '../../../schemas/hooked.yaml.schema-v2.json'),
  JSON.stringify(toJsonSchema7Type(), null, 2)
)
