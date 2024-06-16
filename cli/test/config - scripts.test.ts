/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import path from 'path'
import { describe } from 'mocha'
import sinon from 'sinon'
import YAML from 'yaml'
import exitHandler from '../src/lib/exitHandler.js'
import program from '../src/lib/program.js'
import verifyLocalRequiredTools from '../src/lib/scriptExecutors/verifyLocalRequiredTools.js'
chai.use(chaiAsPromised)
const { expect } = chai

const BASE_CONFIG = {
  env: {
    default: {
      FOO: 'bar'
    }
  },
  scripts: {
    test: {
      "$cmd": 'echo $FOO'
    }
  }
}

describe('program arguments', () => {

  beforeEach(() => {
    if (fs.existsSync('hooked.yaml')) fs.unlinkSync('hooked.yaml')
    sinon.restore()
    sinon.stub(exitHandler, 'onExit').returns()
    sinon.stub(verifyLocalRequiredTools, 'verifyLatestVersion').resolves()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('--printenv should print environment variables (including BASEDIR) only', async () => {
    const filepath = path.resolve('hooked.yaml')
    fs.writeFileSync(filepath, YAML.stringify(BASE_CONFIG), 'utf-8')
    const spylog = sinon.stub(console, 'log')
    await program(["node","index.ts","--printenv","test","--config",filepath])
    sinon.assert.calledOnce(spylog)
    const argument = JSON.parse(spylog.getCall(0).args[0])
    expect(argument).to.eql({
      FOO:'bar', 
      HOOKED_DIR: path.dirname(filepath),
      HOOKED_FILE: filepath
    })
  })
})
