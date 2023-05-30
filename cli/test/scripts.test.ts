/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import sinon from 'sinon'
import { Options } from '../src/lib/program.js'
import { resolveCmdScript, resolveInternalScript } from '../src/lib/scriptExecutors/ScriptExector.js'
import docker from '../src/lib/scriptExecutors/verifyLocalRequiredTools.js'
import { Config, ResolvedEnv } from '../src/lib/types.js'
import logger from '../src/lib/utils/logger.js'
chai.use(chaiAsPromised)
const { expect } = chai

const CONFIG: Config = {
  env: {
    default: {},
    secret: {
      USER: 'bob'
    }
  },
  scripts: {}
}

const OPTIONS: Options = {
  env: 'default',
  stdin: '{}',
}

describe('scripts', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('$internal - executes a javascript function', () => {

    it('$internal - base', async () => {
      const result = await resolveInternalScript('-', {
        $internal: async () => 'Hello'
    }, {}, {}, CONFIG, OPTIONS)
      expect(result).to.eql('Hello')
    })

    it('$internal - with $env', async () => {
      const result = await resolveInternalScript('-', {
        $env: {
          USER: 'bob'
        },
        $internal: async ({ key, stdin, env }) => `Hello ${env.USER}`
    }, {}, {}, CONFIG, OPTIONS)
      expect(result).to.eql('Hello bob')
    })

  })

  describe('$cmd - executes a shell command', () => {

    it('$cmd - simple example', async () => {
      const result = await resolveCmdScript(undefined, {
        $cmd: 'echo "Hello"'
    }, {}, {}, CONFIG, OPTIONS, true)
      expect(result).to.eql('Hello')
    })

    it('$cmd - simple example with error', async () => {
      const promise = resolveCmdScript(undefined, {
        $cmd: 'exit 1'
    }, {}, {}, CONFIG, OPTIONS, true)
      await expect(promise).to.eventually.be.rejected
    })

    it('$cmd - simple example with error and errorMessage', async () => {
      const loggerSpy = sinon.spy(logger, 'warn')
      const errorMessage = 'Error occurred, perhaps try some remediation steps, then try again?'
      const promise = resolveCmdScript(undefined, {
        $cmd: 'exit 1',
        $errorMessage: errorMessage
    }, {}, {}, CONFIG, OPTIONS, true)
      await expect(promise).to.eventually.be.rejected
      sinon.assert.calledWith(loggerSpy, errorMessage)
    })

    it('$cmd - with $env resolution', async () => {
      const globalEnv: ResolvedEnv = {}
      const result = await resolveCmdScript(undefined, {
        $env: {
          USER: 'bob'
        },
        $cmd: 'echo "Hello ${USER}"'
      }, {}, globalEnv, CONFIG, OPTIONS, true)
      expect(result).to.eql('Hello bob')
      // global environment should be updated
      expect(globalEnv.USER).to.eql('bob')
    })

    it('$cmd - with unknown $envNames', async () => {
      await expect(resolveCmdScript(undefined, {
        $envNames: ['secretxxx'],
        $cmd: 'echo "Hello ${USER}"'
      }, {}, {}, CONFIG, OPTIONS, true))
      .to
      .be
      .rejectedWith('Environment not found: secretxxx\nDid you mean?\n\t- default\n\t- secret')
    })

    it('$cmd - with known $envNames', async () => {
      const globalEnv: ResolvedEnv = {}
      const result = await resolveCmdScript(undefined, {
        $envNames: ['secr'],
        $cmd: 'echo "Hello ${USER}"'
      }, {}, globalEnv, CONFIG, OPTIONS, true)
      expect(result).to.eql('Hello bob')
      // global environment should NOT be updated
      expect(globalEnv.USER).to.not.eql('bob')
    })

    it('$cmd - with $image and docker does exist', async () => {
      sinon.stub(docker, 'verifyDockerExists').resolves()
      const result = await resolveCmdScript(undefined, {
        $image: 'node:16-alpine',
        $cmd: 'node -v'
      }, {}, {}, CONFIG, OPTIONS, true)
      expect(result).to.eql('v16.18.1')
    })

    it('$cmd - with $image and docker does NOT exist', async () => {
      sinon.stub(docker, 'verifyDockerExists').rejects(new Error('Docker does not exist!'))
      const result = resolveCmdScript(undefined, {
        $image: 'node:16-alpine',
        $cmd: 'node -v'
      }, {}, {}, CONFIG, OPTIONS, true)
      await expect(result).to.eventually.be.rejectedWith('Docker does not exist!')
    })

    it('$cmd - with $image and $env', async () => {
      sinon.stub(docker, 'verifyDockerExists').resolves()
      const result = await resolveCmdScript(undefined, {
        $env: {
          USER: 'bob'
        },
        $image: 'alpine',
        $cmd: 'echo "Hello ${USER}"'
      }, {}, {}, CONFIG, OPTIONS, true)
      expect(result).to.eql('Hello bob')
    })

    it('$cmd - with $image and $env and $envNames', async () => {
      const globalEnv: ResolvedEnv = {}
      const result = await resolveCmdScript(undefined, {
        $envNames: ['secr'],
        $env: {
          GREETING: 'Hola'
        },
        $image: 'alpine',
        $cmd: 'echo "${GREETING} ${USER}"'
      }, {}, globalEnv, CONFIG, OPTIONS, true)
      expect(result).to.eql('Hola bob')
      // global environment should be updated
      expect(globalEnv.GREETING).to.eql('Hola')
      // global environment should NOT be updated
      expect(globalEnv.USER).to.not.eql('bob')
    })
  })

})
