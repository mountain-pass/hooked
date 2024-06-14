import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import { CONFIG_ADVANCED_GREETING, CONFIG_BLANK, CONFIG_PATH, PAGE_SIZE } from './defaults.js'
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
  return `${HEADER}${YAML.stringify(CONFIG_BLANK())}`
}

export const generateAdvancedBlankTemplateFileContents = (): string => {
  return `${HEADER}${YAML.stringify(CONFIG_ADVANCED_GREETING())}`
}

/**
 * Facilitates creating configuration files.
 */
export const init = async (options: ProgramOptions): Promise<void> => {
  if (options.batch === true) throw new Error('Interactive prompts not supported in batch mode. No hooked.yaml file found.')

  // ask user which hooked.yaml template to use (NOTE: even if only one option, still ask user the chance to escape without creating a file!)
  await inquirer.prompt([
    {
      type: 'list',
      name: 'init',
      message: 'Create new config from:',
      pageSize: PAGE_SIZE,
      choices: [
        { name: 'new Blank template', value: 'blank' },
        { name: 'new Advanced Blank template', value: 'advanced' }
      ],
      loop: true
    }
  ]).then((answers) => {
    if (answers.init === 'blank') {
      logger.debug('Created hooked.yaml from Blank template.')
      fs.writeFileSync(CONFIG_PATH, generateBlankTemplateFileContents(), 'utf-8')
    }
    if (answers.init === 'advanced') {
      logger.debug('Created hooked.yaml from Advanced Blank template.')
      fs.writeFileSync(CONFIG_PATH, generateAdvancedBlankTemplateFileContents(), 'utf-8')
    }
  })
}
