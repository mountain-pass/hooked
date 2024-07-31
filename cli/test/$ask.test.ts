/* eslint-disable no-template-curly-in-string */
import { fail } from 'assert'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import inquirer from 'inquirer'
import { describe } from 'mocha'
import sinon from 'sinon'
import tmp from 'tmp'
import program from '../src/lib/program.js'
import logger from '../src/lib/utils/logger.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('$cmd', () => {
  let spyLoggerInfo: sinon.SinonSpy
  let spyLoggerError: sinon.SinonSpy
  // let spyStdout: sinon.SinonSpy
  // let spyStderr: sinon.SinonSpy
  let inqStub: sinon.SinonStub

  beforeEach(() => {
    sinon.restore()
    spyLoggerInfo = sinon.spy(logger, 'info')
    spyLoggerError = sinon.spy(logger, 'error')
    // spyStdout = sinon.spy(process.stdout, 'write')
    // spyStderr = sinon.spy(process.stderr, 'write')
    inqStub = sinon.stub(inquirer, 'prompt')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('when $stdin is provided, then suggest a fix', async () => {
    const config = tmp.fileSync({ tmpdir: '/tmp', postfix: '.yml'})
    fs.writeFileSync(config.name, `
scripts:
  map:
    $env:
      MAPNAME:
        $stdin: Please choose a level
    $cmd: echo "Hello $MAPNAME"
`)
      try {
        await program(`node index.js --config ${config.name} map`.split(' '))
        fail('Should have thrown an error')
      } catch (e: any) {
        expect(e.message).to.eql(`
Could not resolve 1 environment variables:
- Old script format detected. Please use $ask instead of $stdin.`.trim())
      }
      config.removeCallback()
  })

  it('when $choices has a $cmd, it should be able to resolve the output as choices', async () => {
    const config = tmp.fileSync({ tmpdir: '/tmp', postfix: '.yml', })
    fs.writeFileSync(config.name, `
scripts:
  map:
    $env:
      MAPNAME:
        $ask: Please choose a level
        $choices:
          $cmd: printf "FOO\\nBAR"
    $cmd: echo "Hello $MAPNAME"
`)
      inqStub.resolves({ MAPNAME: 'FOO' })
      await program(`node index.js --config ${config.name} map`.split(' '))
      sinon.assert.callCount(spyLoggerInfo, 1)
      sinon.assert.callCount(spyLoggerError, 0)
      expect(spyLoggerInfo.getCall(0).args[0]).to.eql('Hello FOO\n')
      config.removeCallback()
  })


})
