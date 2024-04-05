import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import { CONFIG_BLANK, CONFIG_PATH, PAGE_SIZE } from './defaults.js'
import { type ProgramOptions } from './program.js'
import { type YamlConfig } from './types.js'
import logger from './utils/logger.js'

/**
 * Generates a blank hooked.yaml file contents.
 */
export const generateBlankTemplateFileContents = (): string => {
  const config: YamlConfig = CONFIG_BLANK()
  // write file
  let configStr = YAML.stringify(config)
  // prepend installation instructions
  configStr = `#
# Hooked configuration file
# See https://github.com/mountain-pass/hooked for more information.
#
# To install the cli: npm i -g @mountainpass/hooked-cli
# To enable yaml validation: https://github.com/mountain-pass/hooked/blob/main/_CONFIG.md#recommended---enable-yaml-schema
#

${configStr}`
  return configStr
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
        { name: 'new Blank template', value: 'blank' }
      ],
      loop: true
    }
  ]).then((answers) => {
    if (answers.init === 'blank') {
      logger.debug('Created hooked.yaml from Blank template.')
      fs.writeFileSync(CONFIG_PATH, generateBlankTemplateFileContents(), 'utf-8')
    }
  })
}
