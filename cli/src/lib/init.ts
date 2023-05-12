import inquirer from 'inquirer'
import { CONFIG_PATH, CONFIG_BLANK, CONFIG_NPM, CONFIG_NPM_EXIST, PAGE_SIZE } from './defaults.js'
import YAML from 'yaml'
import fs from 'fs'
import path from 'path'
import { cyan } from './colour.js'
import { type Config } from './types.js'
import { loadPackageJsonSync } from './utils/packageJson.js'
import logger from './utils/logger.js'
import { type Options } from './program.js'

/**
 * Facilitates creating configuration files.
 */
export const init = async (options: Options): Promise<void> => {
  const packageJson = path.resolve('package.json')
  const fromExistingNPM = fs.existsSync(packageJson) ? [{ name: 'existing NPM (package.json)', value: 'npm_exist' }] : []
  if (options.batch === true) throw new Error('Interactive prompts not supported in batch mode.')
  await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'init',
      message: 'Create new config from:',
      pageSize: PAGE_SIZE,
      choices: [
        { name: 'new Blank template', value: 'blank' },
        { name: 'new NPM template', value: 'npm' },
        ...fromExistingNPM
      ],
      loop: true
    }
  ]).then((answers) => {
    let config: Config = CONFIG_BLANK()
    if (answers.init === 'blank') {
      logger.debug('Created hooked.yaml from Blank template.')
      config = CONFIG_BLANK()
    } else if (answers.init === 'npm') {
      logger.debug('Created hooked.yaml from NPM template. N.B. check the PATH to the node_modules/.bin folder is correct.')
      config = CONFIG_NPM()
    } else if (answers.init === 'npm_exist') {
      logger.debug('Created hooked.yaml from existing NPM. N.B. check the PATH to the node_modules/.bin folder is correct.')
      config = CONFIG_NPM_EXIST(loadPackageJsonSync(packageJson))
    }
    // write file
    const configStr = YAML.stringify(config)
    fs.writeFileSync(CONFIG_PATH, configStr, 'utf-8')
  })
}
