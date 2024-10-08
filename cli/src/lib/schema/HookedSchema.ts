/* eslint-disable max-len */
import { type ZodType, z } from 'zod'
import logger from '../utils/logger.js'
import { type YamlConfig, isString } from '../types.js'

const NameRegex = /^[\w\d_-]+$/
const NameRegexErrorMessage = 'Must only contain alpha, numeric, underscore or hypen.'

export const CronSchedule = z
  .string()
  .regex(/^([\d-/,*]+\s){4}([\d-/,*\w]+)\s([\d-/,*\w]+)$/, 'Must match cron pattern.')
  .describe(`A Cron schedule, including seconds. E.g. '0 0 * * * *'.

field          allowed values
-----          --------------
second         0-59
minute         0-59
hour           0-23
day of month   1-31
month          1-12 (or names, see below)
day of week    0-7 (0 or 7 is Sunday, or use names)
    `)

export const ScriptReference = z
  .string()
  .describe('A path to a script.')

export const CronTrigger = z
  .object({
    $cron: CronSchedule,
    $script: ScriptReference
  })
  .describe('The name of the Cron job.')

export const TriggersGroup = z
  .record(z.string(), CronTrigger)
  .describe('Organises triggers.')
  .optional()

export const HasAccessRoles = (description: string): z.ZodObject<{
  accessRoles: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>
}, 'strip', z.ZodTypeAny, {
  accessRoles?: string[] | undefined
}, {
  accessRoles?: string[] | undefined
}> => z.object({
  accessRoles: z
    .array(
      z.string().regex(NameRegex, NameRegexErrorMessage).min(2).max(255).describe('The name of the access role.')
    )
    .optional()
    .describe(description ?? 'A list of access roles.')
})

export const WritePathScript = z
  .object({
    $path: z.string().describe('Sets the file/folder location.'),
    $content: z.union([z.string(), z.record(z.any())]).describe('Sets the contents of the file to match the string. If an object is provided, will attempt to serialise the content to match either Yaml or Json (using the file extension). If absent, treats the path as a folder. Content is utf-8.').optional(),
    $permissions: z.union([z.string(), z.number()]).describe('Sets the read/write/execute access permissions on the file/folder.').optional(),
    $owner: z.string().describe("Sets the 'uid:gid' of the file/folder. (Note: must be numerical!).").optional(),
    $image: z.string().describe('If supplied, file will be written in this docker image container.').optional(),
    $ssh: z.string().describe('If supplied, file will be written in this remote server.').optional()
  })
  .merge(HasAccessRoles('The roles required to run this script.'))
  .strict()
  .describe('Configuration for writing a file/folder.')

export const JobsSerialScript = z
  .object({
    $jobs_serial: z
      .array(z.union([
        ScriptReference,
        WritePathScript,
        z.object({ $env: z.lazy(() => EnvironmentGroup).describe('Additional environment variables to resolve (added to global environment).') }),
        z.lazy(() => CmdScript)
      ]))
      .describe('Allows running multiple jobs, one after the other. Environment variables will be accumulated, and passed on to future jobs.')
  })
  .merge(HasAccessRoles('The roles required to run this script.'))
  .strict()
  .describe('Allows running multiple jobs, one after the other. Environment variables will be accumulated, and passed on to future jobs.')

/** @deprecated Please use $ask instead. */
export const OldStdinScript = z
  .object({
    $stdin: z.string().describe('Old script format no longer supported. Please use $ask instead of $stdin.')
  })
  .merge(HasAccessRoles('The roles required to run this script.'))
//   .superRefine((val, ctx) => {
//     if (typeof val.$stdin !== 'undefined') {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: 'Old script format no longer supported. Please use $ask instead of $stdin.',
//         path: ['scripts'],
//         fatal: true
//       })
//     }
//     return true
//   })

export const ScriptsGroup: z.ZodRecord<ZodType<string>, ZodType<any>> = z
  .record(z.string(), z.union([
    OldStdinScript,
    JobsSerialScript,
    WritePathScript,
    z.lazy(() => CmdScript),
    z.lazy(() => ScriptsGroup)
  ]))
  .describe('Organises scripts into a named hierarchy. Hint: start with $cmd, $path or $jobs_serial.')

// Stdin

export const StdinChoicesValue = z
  .union([
    z.lazy(() => CmdScript),
    z.string().describe('A multiline string, each line will become a choice.'),
    z.array(z.string()).describe('An array of string options, each entry will become a choice.'),
    z.array(z
      .object({
        name: z.string().describe('A name.'),
        value: z.string().describe('A value.')
      })
      .strict()
      .describe('An array of name/value objects, each entry will become a choice.'))
  ])
  .describe('Provides different choices to the user. Can be a multiline string, array, object, arrays of name/value objects, Scripts, etc.')

export const StdinFieldsMappingValue = z
  .object({
    name: z.string().describe("A JSON path to the 'name' value."),
    value: z.string().describe("A JSON path to the 'value' value.")
  })
  .strict()
  .describe('For JSON arrays, name and value can be overridden by specifying alternative JSON paths.')

export const StdinScript = z
  .object({
    // required
    $ask: z.string().describe('The prompt provided to the user.'),
    // optional
    $default: z.string().describe('The default value provided to the user.').optional(),
    $choices: StdinChoicesValue.optional(),
    $fieldsMapping: StdinFieldsMappingValue.optional(),
    $filter: z.string().describe("A regex filter to apply to the 'name' or values.").optional(),
    $sort: z.enum(['alpha', 'alphaDesc', 'none']).describe("Sorts the displayed 'name' values.").optional()
  })
  .strict()
  .describe('Provides a prompt to the user, to select from a set of choices.')

// Environment

export const EnvironmentValue = z.union([
  z.lazy(() => CmdScript),
  OldStdinScript,
  StdinScript,
  z.string().describe('Resolves to a plain text string.\nResolves any environment variables within the string.\nThrows an error if an environment variable is missing. Can be used to enforce presence of variables.\nReserved environment variables:\n- SKIP_VERSION_CHECK (?)\n- DOCKER_SCRIPT (?)\n- SSH_SCRIPT (?)\n- NPM_SCRIPT (?)\n- MAKE_FILE (?)\n- MAKE_SCRIPT (?)'),
  z.number().describe('Resolves to a plain text string.\nReserved environment variables:\n- SKIP_VERSION_CHECK (?)\n- DOCKER_SCRIPT (?)\n- SSH_SCRIPT (?)\n- NPM_SCRIPT (?)\n- MAKE_FILE (?)\n- MAKE_SCRIPT (?)'),
  z.boolean().describe('Resolves to a plain text string.\nReserved environment variables:\n- SKIP_VERSION_CHECK (?)\n- DOCKER_SCRIPT (?)\n- SSH_SCRIPT (?)\n- NPM_SCRIPT (?)\n- MAKE_FILE (?)\n- MAKE_SCRIPT (?)')
])
  .optional()

export const EnvironmentGroup = z
  .record(z.string(), EnvironmentValue)
  .describe('A named group of environment variables.')

export const CmdScript: z.ZodObject<any> = z
  .object({
    // required
    $cmd: z.string().describe('The command to run. Supports multiline.'),
    // optional
    $env: EnvironmentGroup.describe('Additional environment variables to resolve (added to global environment). Resolved before $envNames').optional(),
    $envNames: z.array(z.string()).describe('Additional environment group names to resolve ONLY when executing this command.').optional(),
    $envFromHost: z.boolean().describe('If true, includes all environment variables from the host machine. (On by default for non-$ssh and non-$image commands.').optional(),
    $errorMessage: z.string().describe('An error message to display, when the `$cmd` exits with a non-zero exit code.').optional(),
    $image: z.string().describe('If supplied, command will execute in this docker image container.').optional(),
    $ssh: z.string().describe('If supplied, command will execute in this remote server.').optional()
  })
  .merge(HasAccessRoles('The roles required to run this script.'))
  .strict()
  .describe('Executes a command, and optionally provides output to environment variables or stdin.')

// Server

export const ServerAuth = z.object({
  type: z.enum(['bcrypt']).describe('The type of authentication.'),
  salt: z.string().min(10).max(100).describe('A salt for the bcrypt algorithm.')
}).describe('Local bcrypt secured credentials.')

//   z.string().describe('A colon delimited user definition. e.g. username:password:role1,role2,...').regex(/^([^:]+:){2}/, 'Must match format username:password:role1,role2,...'),
export const ServerUser = z
  .object({
    username: z.string().regex(NameRegex).min(3).max(50).describe('A unique username.'),
    password: z.string().min(8).max(999).describe('An encrypted password.')
  })
  .merge(HasAccessRoles('The access roles the User has.'))
  .describe('A user account.')

export const ServerDashboardSectionField = z.object({
  label: z.string().describe('The label of the field.'),
  type: z.enum(['display', 'button', 'chip']).describe('The type of the field.'),
  $script: ScriptReference
})

export const ServerDashboardSection = z.object({
  title: z.string().describe('The title of the section.'),
  fields: z.array(ServerDashboardSectionField).describe('A list of fields.')
})

export const ServerDashboard = z.object({
  title: z.string().describe('The title of the dashboard.'),
  // path: z.string().regex(NameRegex, NameRegexErrorMessage).min(2).max(255).describe('The path to the dashboard.'),
  sections: z.array(ServerDashboardSection).describe('A list of sections.')
})
  .merge(HasAccessRoles('The access role/s required to view this dashboard.'))
  .describe('A dashboard configuration.')

export const Server = z
  .object({

    triggers: z
      .record(z.string(), CronTrigger)
      .describe('Provides the ability to trigger jobs.')
      .optional(),

    auth: ServerAuth,

    users: z.array(ServerUser).describe('A list of user accounts.').optional(),

    dashboards: z.array(ServerDashboard).describe('A list of dashboards.').optional()

  }).describe('The server configuration.')
// Export the schema

/**
 * The schema for the hooked configuration file.
 */
export const HookedSchema = z.object({
  imports: z
    .array(z.string().describe('A file path or http endpoint, resolving to a hooked configuration file. File paths support glob pattern matching.'))
    .describe('Specifies a `string[]` of file paths or http endpoints, of hooked configuration files. These files are (downloaded), loaded and merged into the current running configuration (in order).').optional(),

  server: Server.optional(),

  plugins: z
    .object({
      icons: z.boolean().default(true).describe('Makes pretty icons to differentiate executable scripts vs groups.').optional(),
      abi: z.boolean().default(false).describe('Scans for `*.json` files, and imports the contract methods as scripts.\nRequired environment variables:\n- PROVIDER_URL\n- PRIVATE_KEY (?)\n- BLOCK_NUMBER (?)').optional(),
      makefile: z.boolean().default(true).describe('Scans for a `Makefile` file, and imports the named tasks as scripts.').optional(),
      npm: z.boolean().default(true).describe('Scans for a `package.json` file, and imports the named scripts as scripts.').optional()
    })
    .describe('Provides the ability to use built-in plugins.')
    .optional(),

  env: z
    .record(z.string(), z.lazy(() => EnvironmentGroup))
    .describe('Globally defined environment variables, which can be referenced inside `scripts`.')
    .optional(),

  scripts: ScriptsGroup
    .describe('Organises `$cmd`, `$path` and `$jobs_serial` objects, into a named hierarchy.')
    .optional()

}).strict().describe('Manage and execute your scripts from a single place.')

export type HookedSchemaType = z.infer<typeof HookedSchema>
export type HookedServerSchemaType = z.infer<typeof Server>
export type HookedServerDashboardSchemaType = z.infer<typeof ServerDashboard>

/**
 * Returns true if schema is valid.
 */
export const schemaValidator = (configFilePath: string, data: any): data is YamlConfig => {
  const result = HookedSchema.safeParse(data)
  if (result.success) {
    logger.debug(`Configuration file ${configFilePath} is valid.`)
    return true
  } else {
    logger.warn(`Invalid configuration file: ${configFilePath}. ${isString(result.error) ? result.error : JSON.stringify(result.error.format(), null, 2)}`)
    return false
  }
}
