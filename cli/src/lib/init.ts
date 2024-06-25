import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import defaults from './defaults.js'
import { type ProgramOptions } from './program.js'
import logger from './utils/logger.js'

const HEADER = `#
# Hooked configuration file
# See https://github.com/mountain-pass/hooked for more information.
#
# To install the cli: npm i -g @mountainpass/hooked-cli
# To enable yaml validation: https://github.com/mountain-pass/hooked/blob/main/_CONFIG.md#recommended---enable-yaml-schema
#

`

/**
 * Generates a blank hooked.yaml file contents.
 */
export const generateBlankTemplateFileContents = (): string => {
  return `${HEADER}${YAML.stringify(defaults.CONFIG_BLANK(), { blockQuote: 'literal' })}`
}

export const generateAdvancedBlankTemplateFileContents = (): string => {
  return `${HEADER}${YAML.stringify(defaults.CONFIG_ADVANCED_GREETING())}`
}

/** Writes the config to the file location. */
export const writeConfig = async (contents: string, overwrite: boolean): Promise<void> => {
  const filepath = defaults.getDefaults().HOOKED_FILE
  if (!overwrite && fs.existsSync(filepath)) {
    throw new Error(`Cannot create - file already exists '${filepath}'`)
  }
  logger.info(`Writing config file - ${filepath}`)
  fs.writeFileSync(filepath, contents, { encoding: 'utf-8' })
}

export const writeBlankConfig = async (): Promise<void> => {
  await writeConfig(generateBlankTemplateFileContents(), false)
}

/**
 * Facilitates creating configuration files.
 */
export const init = async (options: ProgramOptions): Promise<void> => {
  if (options.batch === true) {
    // initialise a basic config...
    if (options.init === true) {
      await writeConfig(generateBlankTemplateFileContents(), options.force)
      return
    } else {
      // throw error
      throw new Error('Interactive prompts not supported in batch mode. No hooked.yaml file found.')
    }
  }

  // ask user which hooked.yaml template to use (NOTE: even if only one option, still ask user the chance to escape without creating a file!)
  await inquirer.prompt([
    {
      type: 'list',
      name: 'init',
      message: 'Create new config from:',
      pageSize: defaults.getDefaults().PAGE_SIZE,
      choices: [
        { name: 'new Blank template', value: 'blank' },
        { name: 'new Advanced Blank template', value: 'advanced' }
      ],
      loop: true
    }
  ]).then(async (answers) => {
    if (['blank', 'advanced'].includes(answers.init)) {
      const contents = answers.init === 'advanced' ? generateAdvancedBlankTemplateFileContents() : generateBlankTemplateFileContents()
      await writeConfig(contents, options.force)
    }
  })
}
