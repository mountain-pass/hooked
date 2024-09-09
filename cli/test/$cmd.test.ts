/* eslint-disable no-template-curly-in-string */
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import sinon from 'sinon'
import { executeCmd, injectEnvironmentInScript } from '../src/lib/scriptExecutors/$cmd.js'
import { Environment } from '../src/lib/utils/Environment.js'
import logger from '../src/lib/utils/logger.js'
import { CaptureWritableStream } from '../src/lib/common/CaptureWritableStream.js'
import { fetchLastCall } from './utils/SinonUtils.js'
import ApplicationMode from '../src/lib/utils/ApplicationMode.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('$cmd', () => {

  let spyCaptureStreamWhenFinished: sinon.SinonSpy
  let spyLoggerInfo: sinon.SinonSpy
  let spyLoggerError: sinon.SinonSpy
  let spyStdout: any
  let spyStderr: any

  beforeEach(() => {
    sinon.restore()
    spyCaptureStreamWhenFinished = sinon.spy(CaptureWritableStream.prototype, 'whenFinished')
    spyLoggerInfo = sinon.spy(logger, 'info')
    spyLoggerError = sinon.spy(logger, 'error')
    spyStdout = sinon.spy(process.stdout, 'write')
    spyStderr = sinon.spy(process.stderr, 'write')
    sinon.stub(ApplicationMode, 'getApplicationMode').returns('test')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('injectEnvironmentInScript', () => {

    it('injectEnvironmentInScript should append a hashbang and new line if missing', async () => {
      const env = new Environment().putAllGlobal({ FOO: 'bar' })
      expect(injectEnvironmentInScript(`echo "hello"`, env)).to.eql(`#!/bin/sh\necho "hello"\n`)
      expect(injectEnvironmentInScript(`echo "hello"\n`, env)).to.eql(`#!/bin/sh\necho "hello"\n`)
      expect(injectEnvironmentInScript(`#!/bin/sh\necho "hello"`, env)).to.eql(`#!/bin/sh\necho "hello"\n`)
      expect(injectEnvironmentInScript(`#!/bin/sh\necho "hello"\n`, env)).to.eql(`#!/bin/sh\necho "hello"\n`)
    })

    it('injectEnvironmentInScript injects "resolved" environment variables only', async () => {
      const env = new Environment().putAllResolved({ FOO: 'bar' })
      // should inject in header
      expect(injectEnvironmentInScript(`echo "hello"`, env)).to.eql(`#!/bin/sh\n\nexport FOO="bar"\n\necho "hello"\n`)
      expect(injectEnvironmentInScript(`echo "hello"\n`, env)).to.eql(`#!/bin/sh\n\nexport FOO="bar"\n\necho "hello"\n`)
      // ... but after hash bang
      expect(injectEnvironmentInScript(`#!/bin/sh\necho "hello"`, env)).to.eql(`#!/bin/sh\n\nexport FOO="bar"\n\necho "hello"\n`)
      expect(injectEnvironmentInScript(`#!/bin/sh\necho "hello"\n`, env)).to.eql(`#!/bin/sh\n\nexport FOO="bar"\n\necho "hello"\n`)
      // ... and not accidently pickup comments
      expect(injectEnvironmentInScript(`echo "hello"\n# comment`, env)).to.eql(`#!/bin/sh\n\nexport FOO="bar"\n\necho "hello"\n# comment\n`)
      expect(injectEnvironmentInScript(`echo "hello"\n# comment\n`, env)).to.eql(`#!/bin/sh\n\nexport FOO="bar"\n\necho "hello"\n# comment\n`)
      // ... and not accidently pickup other hash bangs
      expect(injectEnvironmentInScript(`#!/bin/sh\necho "hello"\n#!/comment`, env)).to.eql(`#!/bin/sh\n\nexport FOO="bar"\n\necho "hello"\n#!/comment\n`)
      expect(injectEnvironmentInScript(`#!/bin/sh\necho "hello"\n#!/comment\n`, env)).to.eql(`#!/bin/sh\n\nexport FOO="bar"\n\necho "hello"\n#!/comment\n`)
    })
  })

  describe('.executeCmd()', () => {

    it('captureStdout=true, printStdio=true - should return output, and print output', async () => {
      const result2 = await executeCmd('-', { $cmd: 'echo "Hello"' }, {} as any, {}, new Environment(), { captureStdout: true, printStdio: true })
      expect(result2).to.eql('Hello\n')
      // sinon.assert.calledWithExactly(spyStdout, 'Hello\n')
      // sinon.assert.notCalled(spyStderr)
    })

    it('captureStdout=false, printStdio=true - should NOT return output, and print output', async () => {
      const result2 = await executeCmd('-', { $cmd: 'echo "Hello"' }, {} as any, {}, new Environment(), { captureStdout: false, printStdio: true })
      expect(result2).to.eql('')
      const calls = fetchLastCall(spyCaptureStreamWhenFinished)
      expect(calls.last).to.eql('Hello')
    })

    it('captureStdout=true, printStdio=false - should return output, and NOT print output', async () => {
      const result2 = await executeCmd('-', { $cmd: 'echo "Hello"' }, {} as any, {}, new Environment(), { captureStdout: true, printStdio: false })
      expect(result2).to.eql('Hello\n')
      sinon.assert.callCount(spyLoggerInfo, 0)
      sinon.assert.callCount(spyLoggerError, 0)
    })

    it('captureStdout=false, printStdio=false - should NOT return output, and NOT print output (bit pointless!)', async () => {
      const result2 = await executeCmd('-', { $cmd: 'echo "Hello"' }, {} as any, {}, new Environment(), { captureStdout: false, printStdio: false })
      expect(result2).to.eql('')
      // sinon.assert.notCalled(spyStdout)
      // sinon.assert.notCalled(spyStderr)
    })

    it('captureStdout=true, printStdio=true - stderr output should NOT return output, and print COLOURED output', async () => {
      const result2 = await executeCmd('-', { $cmd: '>&2 echo "Hello"' }, {} as any, {}, new Environment(), { captureStdout: true, printStdio: true })
      expect(result2).to.eql('')
      // sinon.assert.notCalled(spyStdout)
      // sinon.assert.calledWithExactly(spyStderr, '\u001b[90mHello\n\u001b[0m')
    })

    it('wip exit codes other than zero, should throw an error', async () => {
      const expected = `Command failed with status code 99\nUnderlying error: "Command failed: /.*.sh"\nConsider adding a \"set -ve\" to your $cmd to see which line errored\.`
      const actual = await executeCmd('-', { $cmd: 'exit 99' }, {} as any, {}, new Environment(), { captureStdout: true, printStdio: true }).catch(err => err)
      await expect(actual.message).to.satisfy((s: string) => s.startsWith('Command failed with status code 99\nUnderlying error: "Command failed:'))
      await expect(actual.message).to.satisfy((s: string) => s.endsWith('Consider adding a "set -ve" to your $cmd to see which line errored.'))
    })

  })

})
