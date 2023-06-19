import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import { CONFIG_BLANK, CONFIG_PATH, PAGE_SIZE } from './defaults.js'
import { type ProgramOptions } from './program.js'
import { type YamlConfig } from './types.js'
import logger from './utils/logger.js'

/**
 * Facilitates creating configuration files.
 */
export const init = async (options: ProgramOptions): Promise<void> => {
  if (options.batch === true) throw new Error('Interactive prompts not supported in batch mode. No hooked.yaml file found.')
  // ask user which hooked.yaml template to use
  await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'init',
      message: 'Create new config from:',
      pageSize: PAGE_SIZE,
      choices: [
        { name: 'new Blank template', value: 'blank' }
      ],
      loop: true
    }
  ]).then((answers) => {
    let config: YamlConfig = CONFIG_BLANK()
    if (answers.init === 'blank') {
      logger.debug('Created hooked.yaml from Blank template.')
      config = CONFIG_BLANK()
    }
    // write file
    const configStr = YAML.stringify(config)
    fs.writeFileSync(CONFIG_PATH, configStr, 'utf-8')
  })
}
