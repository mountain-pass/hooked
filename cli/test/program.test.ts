/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import path from 'path'
import { describe } from 'mocha'
import sinon from 'sinon'
import YAML from 'yaml'
import defaults from '../src/lib/defaults.js'
import exitHandler from '../src/lib/exitHandler.js'
import { newProgram } from '../src/lib/program.js'
import verifyLocalRequiredTools from '../src/lib/scriptExecutors/verifyLocalRequiredTools.js'

import child_process from 'child_process'
import { Command } from 'commander'
import logger, { Logger } from '../src/lib/utils/logger.js'
import { YamlConfig } from '../src/lib/types.js'
chai.use(chaiAsPromised)
const { expect } = chai

const BASE_CONFIG = {
  env: {
    default: {
      FOO: 'bar${HOSTVAR}'
    }
  },
  scripts: {
    test: {
      $envFromHost: false,
      $cmd: 'echo $FOO'
    }
  }
}
const BASE_CONFIG_2 = {
  env: {
    default: {
      FOO: {
        $cmd: "bar${HOSTVAR}"
      }
    }
  },
  scripts: {
    test: {
      $cmd: 'echo $FOO'
    }
  }
}
const BASE_CONFIG_3 = {
  scripts: {
    test: {
      $env: {
        FOO: 'bar${HOSTVAR}'
      },
      $cmd: 'echo $FOO'
    }
  }
}
const BASE_CONFIG_4 = {
  scripts: {
    test: {
      $env: {
        FOO: {
          $cmd: "bar${HOSTVAR}"
        }
      },
      $cmd: 'echo $FOO'
    }
  }
}

const writeConfig =(config: any, path = 'hooked.yaml') => {
  fs.writeFileSync(path, YAML.stringify(config), 'utf-8')
}

describe('program', () => {

  let program: Command
  let spylog: any

  const SYSTEM_ENVIRONMENT_VARIABLES = {
    HOSTVAR: 'HOST_VAR_RESOLVED',
    OTHER_HOST_VAR: 'SHOULD_NOT_BE_PASSED'
  }

  const hookedFile = path.resolve('hooked.yaml')

  beforeEach(() => {
    if (fs.existsSync(hookedFile)) fs.unlinkSync(hookedFile)
    sinon.restore()
    sinon.stub(exitHandler, 'onExit').returns()
    sinon.stub(verifyLocalRequiredTools, 'verifyLatestVersion').resolves()
    sinon.stub(defaults, 'setDefaultConfigurationFilepath').returns()
    spylog = sinon.spy(logger, 'info')
    program = newProgram(SYSTEM_ENVIRONMENT_VARIABLES, false)
  })

  afterEach(() => {
    // if (fs.existsSync(hookedFile)) fs.unlinkSync(hookedFile)
    sinon.restore()
  })

  // it('missing hooked.yaml file should exit', async () => {
  //   const spyexit = sinon.stub(process, 'exit')
  //   const spyerr = sinon.stub(console, 'error')
  //   program.parseAsync([])
  //   sinon.assert.calledWithExactly(spyexit, 1)
  //   sinon.assert.calledWithExactly(spyerr, `\u001b[31mNo ${CONFIG_PATH} file found.\u001b[0m`)
  // })

  const printEnv = async (config: any) => {
    writeConfig(BASE_CONFIG)
    await program.parseAsync(["node", "index.ts","-b","--printenv","test"])
    expect(spylog.getCalls().length).to.eql(1)
    sinon.assert.calledOnce(spylog)
    const result = JSON.parse(spylog.getCall(0).args[0])
    return result
  }

  const DEFAULT_ENV_VARS = {
    "HOOKED_DIR": path.dirname(hookedFile),
    "HOOKED_FILE": hookedFile
  }

  it('--printenv should print environment variables only', async () => {
    // assuming { HOSTVAR: 'HOST_VAR_RESOLVED' } is already set in the environment...
    expect(await printEnv(BASE_CONFIG)).to.eql({ FOO: 'barHOST_VAR_RESOLVED', ...DEFAULT_ENV_VARS })
  })

  it('--printenv should print environment variables only #2', async () => {
    // assuming { HOSTVAR: 'HOST_VAR_RESOLVED' } is already set in the environment...
    expect(await printEnv(BASE_CONFIG_2)).to.eql({ FOO: 'barHOST_VAR_RESOLVED', ...DEFAULT_ENV_VARS })
  })

  it('--printenv should print environment variables only #3', async () => {
    // assuming { HOSTVAR: 'HOST_VAR_RESOLVED' } is already set in the environment...
    expect(await printEnv(BASE_CONFIG_3)).to.eql({ FOO: 'barHOST_VAR_RESOLVED', ...DEFAULT_ENV_VARS })
  })

  it('--printenv should print environment variables only #4', async () => {
    // assuming { HOSTVAR: 'HOST_VAR_RESOLVED' } is already set in the environment...
    expect(await printEnv(BASE_CONFIG_4)).to.eql({ FOO: 'barHOST_VAR_RESOLVED', ...DEFAULT_ENV_VARS })
  })

  it('--stdin should support strict json', async () => {
    writeConfig({...BASE_CONFIG, ...{env: { default: { FOO: { $stdin: 'hello there'}}}}})
    await program.parseAsync(["node", "index.ts","-b","--printenv","test", "--stdin", '{"FOO":"cat"}'])
    sinon.assert.calledOnceWithExactly(spylog, JSON.stringify({FOO:'cat', ...DEFAULT_ENV_VARS}))
  })

  it('--stdin should support relaxed json', async () => {
    writeConfig({...BASE_CONFIG, ...{env: { default: { FOO: { $stdin: 'hello there'}}}}})
    await program.parseAsync(["node", "index.ts","-b","--printenv","test", "--stdin", "{FOO:'dog'}"])
    sinon.assert.calledOnceWithExactly(spylog, JSON.stringify({FOO:'dog', ...DEFAULT_ENV_VARS}))
  })

  it('should throw error, if no config file exists (and run in batch mode)', async () => {
    await expect(program.parseAsync('node index.ts -b test'.split(' '))).to.be.rejectedWith('Interactive prompts not supported in batch mode. No hooked.yaml file found.')
  })

  it('should throw error, if script cannot be found (and run in batch mode)', async () => {
    writeConfig(BASE_CONFIG)
    await expect(program.parseAsync('node index.ts -b notavalidscript'.split(' '))).to.be.rejectedWith(`Interactive prompts not supported in batch mode. Could not determine a script to run. scriptPath='notavalidscript'`)
  })


  it('host environment variables should not be passed to script when executed', async () => {
    writeConfig(BASE_CONFIG)
    const execSpy = sinon.stub(child_process, 'execSync').returns('mocked_result')
    await program.parseAsync('node index.ts -b test'.split(' '))
    sinon.assert.calledOnce(execSpy)
    // the environment provided to the script should be the one defined in the config ONLY (not system!)
    expect(execSpy.getCall(0).args[1]?.env).to.eql({
      FOO: 'barHOST_VAR_RESOLVED',
      HOOKED_ROOT: 'false',
      ...DEFAULT_ENV_VARS
    })
  })

  it('order should not matter when resolving - part2 - multiple environment resolution', async () => {
    const config: YamlConfig = {
      env: {
        default: {
          cat: '${foo}',
        },
        custom: {
          foo: 'bar'
        }
      },
      scripts: {
        test: {
          $envFromHost: false,
          $cmd: 'echo "${cat}"'
        }
      }
    }
    writeConfig(config)
    const execSpy = sinon.stub(child_process, 'execSync').returns('mocked_result')
    await program.parseAsync('node index.ts -b test --env default,custom'.split(' '))

    // verify that the script was called with the correct environment
    sinon.assert.calledOnce(execSpy)
    expect(execSpy.getCall(0).args[1]?.env).to.eql({
      cat: 'bar',
      foo: 'bar',
      HOOKED_ROOT: 'false',
      ...DEFAULT_ENV_VARS
    })
  })

  it('command line provided stdin, should be added to the resolvable envvars', async () => {
    const config: YamlConfig = {
      env: {
        default: {
          connectTo: 'root@${IPADDR}',
        }
      },
      scripts: {
        test: {
          $envFromHost: false,
          $cmd: 'echo "${connectTo}"'
        }
      }
    }
    writeConfig(config)
    const execSpy = sinon.stub(child_process, 'execSync').returns('mocked_result')
    await program.parseAsync(`node index.ts -b test --stdin {"IPADDR":"192.168.0.1"}`.split(' '))

    // verify that the script was called with the correct environment
    sinon.assert.calledOnce(execSpy)
    expect(execSpy.getCall(0).args[1]?.env).to.eql({
      connectTo: 'root@192.168.0.1',
      IPADDR: "192.168.0.1",
      HOOKED_ROOT: 'false',
      ...DEFAULT_ENV_VARS
    })
  })

  it('order should not matter when resolving - part3 - complex cross env / job resolution', async () => {
    const config: YamlConfig = {
      env: {
        default: {
          seven: '${eight}-7',
          eight: '8',
        },
        custom: {
          foo: '${BAR}',
          cat: 'DOG'
        }
      },
      scripts: {
        test: {$job_chain:[
          {$env: {
            SCRIPT: 'echo "${foo}"',
            BAR: 'bar'
          }},
          {
          $envNames: ['custom'],
          $envFromHost: false,
          $cmd: 'echo "${SCRIPT}"'
        }
      ]}
      }
    }
    writeConfig(config)
    const execSpy = sinon.stub(child_process, 'execSync').returns('mocked_result')
    await program.parseAsync('node index.ts -b test --env custom'.split(' '))

    // verify that the script was called with the correct environment
    sinon.assert.calledOnce(execSpy)
    expect(execSpy.getCall(0).args[1]?.env).to.eql({
      SCRIPT: 'echo "bar"',
      cat: 'DOG',
      BAR: 'bar',
      foo: 'bar',
      seven: '8-7',
      eight: '8',
      HOOKED_ROOT: 'false',
      ...DEFAULT_ENV_VARS
    })
  })
  
  // TODO check HOSTVAR, that is defined in $env, DOES come through
})
