import inquirer from 'inquirer'
import { CONFIG_PATH, CONFIG_BLANK, CONFIG_NPM, CONFIG_NPM_EXIST } from './defaults.js'
import YAML from 'yaml'
import fs from 'fs'
import path from 'path'
import { cyan } from './colour.js'
import { type Config } from './types.js'
import { loadPackageJsonSync } from './utils/packageJson.js'

/**
 * Facilicates creating configuration files.
 */
export const init = async (): Promise<void> => {
  const packageJson = path.resolve('package.json')
  const fromExistingNPM = fs.existsSync(packageJson) ? [{ name: 'existing NPM (package.json)', value: 'npm_exist' }] : []
  await inquirer.prompt([
    {
      type: 'list',
      name: 'init',
      message: 'Create new config from:',
      choices: [
        { name: 'new Blank template', value: 'blank' },
        { name: 'new NPM template', value: 'npm' },
        ...fromExistingNPM
      ],
      loop: false
    }
  ]).then((answers) => {
    let config: Config = CONFIG_BLANK()
    if (answers.init === 'blank') {
      console.log(cyan('Created hooked.yaml from Blank template.'))
      config = CONFIG_BLANK()
    } else if (answers.init === 'npm') {
      console.log(cyan('Created hooked.yaml from NPM template. N.B. check the PATH to the node_modules/.bin folder is correct.'))
      config = CONFIG_NPM()
    } else if (answers.init === 'npm_exist') {
      console.log(cyan('Created hooked.yaml from existing NPM. N.B. check the PATH to the node_modules/.bin folder is correct.'))
      config = CONFIG_NPM_EXIST(loadPackageJsonSync(packageJson))
    }
    // write file
    const configStr = YAML.stringify(config)
    fs.writeFileSync(CONFIG_PATH, configStr, 'utf-8')
  })
}
