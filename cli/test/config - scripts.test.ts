/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import { describe } from 'mocha'
import sinon from 'sinon'
import YAML from 'yaml'
import { CONFIG_PATH } from '../src/lib/defaults.js'
import program from '../src/lib/program.js'
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
