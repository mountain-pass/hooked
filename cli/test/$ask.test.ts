/* eslint-disable no-template-curly-in-string */
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import sinon from 'sinon'
import { executeCmd, injectEnvironmentInScript } from '../src/lib/scriptExecutors/$cmd.js'
import { Environment } from '../src/lib/utils/Environment.js'
import program from '../src/lib/program.js'
chai.use(chaiAsPromised)
const { expect } = chai
import tmp from 'tmp'
import fs from 'fs'
import inquirer from 'inquirer'
import { fail } from 'assert'

describe('$cmd', () => {
  let spyStdout: sinon.SinonSpy
  let spyStderr: sinon.SinonSpy
  let inqStub: sinon.SinonStub

  beforeEach(() => {
    sinon.restore()
    spyStdout = sinon.spy(process.stdout, 'write')
    spyStderr = sinon.spy(process.stderr, 'write')
    inqStub = sinon.stub(inquirer, 'prompt')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('wip when $stdin is provided, then suggest a fix', async () => {
    const config = tmp.fileSync({ tmpdir: '/tmp', postfix: '.yml'})
    fs.writeFileSync(config.name, `
scripts:
  map:
    $env:
      MAPNAME:
        $stdin: Please choose a level
        $choices:
          $cmd: printf "FOO\\nBAR"
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
      sinon.assert.callCount(spyStdout, 2)
      expect(spyStdout.getCall(0).args[0]).to.eql('FOO\nBAR\n')
      expect(spyStdout.getCall(1).args[0]).to.eql('Hello FOO\n\n')
      config.removeCallback()
  })


})
