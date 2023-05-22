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

describe('wip program', () => {

  beforeEach(() => {
    if (fs.existsSync('hooked.yaml')) fs.unlinkSync('hooked.yaml')
    sinon.restore()
  })

  afterEach(() => {
    // if (fs.existsSync('hooked.yaml')) fs.unlinkSync('hooked.yaml')
    sinon.restore()
  })

  // it('missing hooked.yaml file should exit', async () => {
  //   const spyexit = sinon.stub(process, 'exit')
  //   const spyerr = sinon.stub(console, 'error')
  //   await program([])
  //   sinon.assert.calledWithExactly(spyexit, 1)
  //   sinon.assert.calledWithExactly(spyerr, `\u001b[31mNo ${CONFIG_PATH} file found.\u001b[0m`)
  // })

  it('--printenv should print environment variables only', async () => {
    fs.writeFileSync('hooked.yaml', YAML.stringify(BASE_CONFIG), 'utf-8')
    const spylog = sinon.stub(console, 'log')
    await program(["node", "index.ts","--printenv","test"])
    sinon.assert.calledOnceWithExactly(spylog, JSON.stringify({FOO:'bar'}))
  })

  it('--stdin should support strict json', async () => {
    fs.writeFileSync('hooked.yaml', YAML.stringify({...BASE_CONFIG, ...{env: { default: { FOO: { $stdin: 'hello there'}}}}}), 'utf-8')
    const spylog = sinon.stub(console, 'log')
    await program(["node", "index.ts","--printenv","test", "--stdin", '{"FOO":"cat"}'])
    sinon.assert.calledOnceWithExactly(spylog, JSON.stringify({FOO:'cat'}))
  })

  it('--stdin should support relaxed json', async () => {
    fs.writeFileSync('hooked.yaml', YAML.stringify({...BASE_CONFIG, ...{env: { default: { FOO: { $stdin: 'hello there'}}}}}), 'utf-8')
    const spylog = sinon.stub(console, 'log')
    await program(["node", "index.ts","--printenv","test", "--stdin", "{FOO:'dog'}"])
    sinon.assert.calledOnceWithExactly(spylog, JSON.stringify({FOO:'dog'}))
  })
})
