/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import { describe } from 'mocha'
import sinon from 'sinon'
import YAML from 'yaml'
import exitHandler from '../src/lib/exitHandler.js'
import { newProgram } from '../src/lib/program.js'
import verifyLocalRequiredTools from '../src/lib/scriptExecutors/verifyLocalRequiredTools.js'

import child_process from 'child_process'
import { Command } from 'commander'
import logger, { Logger } from '../src/lib/utils/logger.js'
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

const writeConfig =(config: any) => {
  fs.writeFileSync('hooked.yaml', YAML.stringify(config), 'utf-8')
}

describe('wip program', () => {

  let program: Command
  let spylog: any

  beforeEach(() => {
    if (fs.existsSync('hooked.yaml')) fs.unlinkSync('hooked.yaml')
    sinon.restore()
    sinon.stub(exitHandler, 'onExit').returns()
    sinon.stub(verifyLocalRequiredTools, 'verifyLatestVersion').resolves()
    spylog = sinon.spy(logger, 'info')
    program = newProgram({HOSTVAR: 'HOST_VAR_RESOLVED', OTHER_HOST_VAR: 'SHOULD_NOT_BE_PASSED'})
  })

  afterEach(() => {
    // if (fs.existsSync('hooked.yaml')) fs.unlinkSync('hooked.yaml')
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

  it('--printenv should print environment variables only', async () => {
    // assuming { HOSTVAR: 'HOST_VAR_RESOLVED' } is already set in the environment...
    expect(await printEnv(BASE_CONFIG)).to.eql({ FOO: 'barHOST_VAR_RESOLVED' })
  })

  it('--printenv should print environment variables only #2', async () => {
    // assuming { HOSTVAR: 'HOST_VAR_RESOLVED' } is already set in the environment...
    expect(await printEnv(BASE_CONFIG_2)).to.eql({ FOO: 'barHOST_VAR_RESOLVED' })
  })

  it('--printenv should print environment variables only #3', async () => {
    // assuming { HOSTVAR: 'HOST_VAR_RESOLVED' } is already set in the environment...
    expect(await printEnv(BASE_CONFIG_3)).to.eql({ FOO: 'barHOST_VAR_RESOLVED' })
  })

  it('--printenv should print environment variables only #4', async () => {
    // assuming { HOSTVAR: 'HOST_VAR_RESOLVED' } is already set in the environment...
    expect(await printEnv(BASE_CONFIG_4)).to.eql({ FOO: 'barHOST_VAR_RESOLVED' })
  })

  it('--stdin should support strict json', async () => {
    writeConfig({...BASE_CONFIG, ...{env: { default: { FOO: { $stdin: 'hello there'}}}}})
    await program.parseAsync(["node", "index.ts","-b","--printenv","test", "--stdin", '{"FOO":"cat"}'])
    sinon.assert.calledOnceWithExactly(spylog, JSON.stringify({FOO:'cat'}))
  })

  it('--stdin should support relaxed json', async () => {
    writeConfig({...BASE_CONFIG, ...{env: { default: { FOO: { $stdin: 'hello there'}}}}})
    await program.parseAsync(["node", "index.ts","-b","--printenv","test", "--stdin", "{FOO:'dog'}"])
    sinon.assert.calledOnceWithExactly(spylog, JSON.stringify({FOO:'dog'}))
  })

  it('should throw error, if no config file exists and run in batch mode', async () => {
    await expect(program.parseAsync(["node", "index.ts","-b","test"])).to.be.rejectedWith('Interactive prompts not supported in batch mode.')
  })


  it.skip('host environment variables should not be passed to script when executed', async () => {
    writeConfig(BASE_CONFIG)
    const execSpy = sinon.stub(child_process, 'execSync').returns('mocked_result')
    await program.parseAsync(["node", "index.ts","-b","test"])
    sinon.assert.calledOnce(execSpy)
    expect(execSpy.getCall(0).args[1]?.env).to.eql({ FOO: 'barHOST_VAR_RESOLVED' }) // but other HOST VARS should not be present!
  })
  
  // TODO check HOSTVAR, that is defined in $env, DOES come through
})
