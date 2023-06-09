/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import sinon from 'sinon'
import { createProcess, executeCmd } from '../src/lib/scriptExecutors/$cmd.js'
import { Environment } from '../src/lib/utils/Environment.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('$cmd', () => {
  let spyStdout: any
  let spyStderr: any
  beforeEach(() => {
    sinon.restore()
    spyStdout = sinon.spy(process.stdout, 'write')
    spyStderr = sinon.spy(process.stderr, 'write')
  })
  afterEach(() => {
    sinon.restore()
  })

  describe('.executeCmd()', () => {

    it('captureStdout=true, printStdio=true - should return output, and print output', async () => {
      const result2 = await executeCmd({ $cmd: 'echo "Hello"' }, {}, new Environment(), { captureStdout: true, printStdio: true })
      expect(result2).to.eql('Hello\n')
      // sinon.assert.calledWithExactly(spyStdout, 'Hello\n')
      // sinon.assert.notCalled(spyStderr)
    })

    it('captureStdout=false, printStdio=true - should NOT return output, and print output', async () => {
      const result2 = await executeCmd({ $cmd: 'echo "Hello"' }, {}, new Environment(), { captureStdout: false, printStdio: true })
      expect(result2).to.eql('')
      // sinon.assert.calledWithExactly(spyStdout, 'Hello\n')
      // sinon.assert.notCalled(spyStderr)
    })

    it('captureStdout=true, printStdio=false - should return output, and NOT print output', async () => {
      const result2 = await executeCmd({ $cmd: 'echo "Hello"' }, {}, new Environment(), { captureStdout: true, printStdio: false })
      expect(result2).to.eql('Hello\n')
      // sinon.assert.notCalled(spyStdout)
      // sinon.assert.notCalled(spyStderr)
    })

    it('captureStdout=false, printStdio=false - should NOT return output, and NOT print output (bit pointless!)', async () => {
      const result2 = await executeCmd({ $cmd: 'echo "Hello"' }, {}, new Environment(), { captureStdout: false, printStdio: false })
      expect(result2).to.eql('')
      // sinon.assert.notCalled(spyStdout)
      // sinon.assert.notCalled(spyStderr)
    })

    it('captureStdout=true, printStdio=true - stderr output should NOT return output, and print COLOURED output', async () => {
      const result2 = await executeCmd({ $cmd: '>&2 echo "Hello"' }, {}, new Environment(), { captureStdout: true, printStdio: true })
      expect(result2).to.eql('')
      // sinon.assert.notCalled(spyStdout)
      // sinon.assert.calledWithExactly(spyStderr, '\u001b[90mHello\n\u001b[0m')
    })

    it('exit codes other than zero, should throw an error', async () => {
      const expected = `Command failed with status code 99\nUnderlying error: "Command failed: /.*.sh"\nConsider adding a \"set -ve\" to your \\$cmd to see which line errored\.`
      await expect(executeCmd({ $cmd: 'exit 99' }, {}, new Environment(), { captureStdout: true, printStdio: true })).to.be.rejectedWith(new RegExp(expected))
    })

  })

})
