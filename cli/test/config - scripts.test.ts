/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
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

describe('wip program arguments', () => {

  beforeEach(() => {
    if (fs.existsSync('hooked.yaml')) fs.unlinkSync('hooked.yaml')
    sinon.restore()
    sinon.stub(exitHandler, 'onExit').returns()
    sinon.stub(verifyLocalRequiredTools, 'verifyLatestVersion').resolves()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('--printenv should print environment variables only', async () => {
    fs.writeFileSync('hooked.yaml', YAML.stringify(BASE_CONFIG), 'utf-8')
    const spylog = sinon.stub(console, 'log')
    await program(["node", "index.ts","--printenv","test"])
    sinon.assert.calledOnceWithExactly(spylog, JSON.stringify({FOO:'bar'}))
  })
})
