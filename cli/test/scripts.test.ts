/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import sinon from 'sinon'
import { ProgramOptions } from '../src/lib/program.js'
import { resolveCmdScript, resolveInternalScript } from '../src/lib/scriptExecutors/ScriptExecutor.js'
import docker from '../src/lib/scriptExecutors/verifyLocalRequiredTools.js'
import { EnvironmentVariables, YamlConfig } from '../src/lib/types.js'
import { Environment } from '../src/lib/utils/Environment.js'
import logger from '../src/lib/utils/logger.js'
chai.use(chaiAsPromised)
const { expect } = chai

const CONFIG: YamlConfig = {
  env: {
    default: {},
    secret: {
      USER: 'bob'
    }
  },
  scripts: {}
}

const OPTIONS: ProgramOptions = {
  env: 'default',
  stdin: '{}',
}

describe('scripts', () => {

  let envVars: EnvironmentVariables = {}
  beforeEach(() => {
    envVars = {}
  })
  afterEach(() => {
    sinon.restore()
  })

  describe('$internal - executes a javascript function', () => {

    it('$internal - base', async () => {
      const result = await resolveInternalScript('-', {
        $internal: async () => 'Hello'
    }, {}, new Environment(), CONFIG, OPTIONS, envVars)
      expect(result).to.eql('Hello')
    })

    it('$internal - with $env', async () => {
      const result = await resolveInternalScript('-', {
        $env: {
          USER: 'bob'
        },
        $internal: async ({ key, stdin, env }) => `Hello ${env.resolveByKey('USER')}`
    }, {}, new Environment(), CONFIG, OPTIONS, envVars)
      expect(result).to.eql('Hello bob')
    })

  })

  describe('$cmd - executes a shell command', () => {

    it('$cmd - simple example #1', async () => {
      const result = await resolveCmdScript('-', {
        $cmd: 'echo "Hello"'
    }, {}, new Environment(), CONFIG, OPTIONS)
      expect(result).to.eql('Hello')
    })

    it('$cmd - simple example with error', async () => {
      const promise = resolveCmdScript('-', {
        $cmd: 'exit 1'
    }, {}, new Environment(), CONFIG, OPTIONS)
      await expect(promise).to.eventually.be.rejected
    })

    it('$cmd - simple example with error and errorMessage', async () => {
      const loggerSpy = sinon.spy(logger, 'warn')
      const errorMessage = 'Error occurred, perhaps try some remediation steps, then try again?'
      const promise = resolveCmdScript('-', {
        $cmd: 'exit 1',
        $errorMessage: errorMessage
    }, {}, new Environment(), CONFIG, OPTIONS)
      await expect(promise).to.eventually.be.rejected
      sinon.assert.calledWith(loggerSpy, errorMessage)
    })

    it('$cmd - with $env resolution', async () => {
      const env = new Environment()
      const result = await resolveCmdScript('-', {
        $env: {
          USER: 'bob'
        },
        $cmd: 'echo "Hello ${USER}"'
      }, {}, env, CONFIG, OPTIONS)
      expect(result).to.eql('Hello bob')
      // global environment should be updated
      expect(env.resolveByKey('USER')).to.eql('bob')
    })

    it('$cmd - with unknown $envNames', async () => {
      await expect(resolveCmdScript('-', {
        $envNames: ['secretxxx'],
        $cmd: 'echo "Hello ${USER}"'
      }, {}, new Environment(), CONFIG, OPTIONS))
      .to
      .be
      .rejectedWith('Environment not found: secretxxx\nDid you mean?\n\t- default\n\t- secret')
    })

    // skipped: I'm not sure what we're testing here - Nick
    it('$cmd - with known $envNames', async () => {
      // Given the secret USER env is "bob"...
      const env = new Environment()
      // when we resolve the script...
      const result = await resolveCmdScript('-', {
        $envNames: ['secr'],
        $cmd: 'echo "Hello ${USER}"'
      }, {}, env, CONFIG, OPTIONS)
      // then the output should be "Hello bob"...
      expect(result).to.eql('Hello bob')
      // and the global environment should have the env "USER" (defined in the "secret" environment)
      expect(env.global).to.eql({})
      // expect(env.global.USER).to.eql('bob')
    })

    it('$cmd - with $image and docker does exist', async () => {
      sinon.stub(docker, 'verifyDockerExists').resolves()
      const result = await resolveCmdScript('-', {
        $image: 'node@sha256:6c381d5dc2a11dcdb693f0301e8587e43f440c90cdb8933eaaaabb905d44cdb9', // node:16-alpine
        $cmd: 'node -v'
      }, {}, new Environment(), CONFIG, OPTIONS)
      expect(result).to.eql('v16.20.1')
    })

    it('$cmd - with $image and docker does NOT exist', async () => {
      sinon.stub(docker, 'verifyDockerExists').rejects(new Error('Docker does not exist!'))
      const result = resolveCmdScript('-', {
        $image: 'node@sha256:6c381d5dc2a11dcdb693f0301e8587e43f440c90cdb8933eaaaabb905d44cdb9', // node:16-alpine
        $cmd: 'node -v'
      }, {}, new Environment(), CONFIG, OPTIONS)
      await expect(result).to.eventually.be.rejectedWith('Docker does not exist!')
    })

    it('$cmd - with $image and $env', async () => {
      sinon.stub(docker, 'verifyDockerExists').resolves()
      const env = new Environment()
      const result = await resolveCmdScript('-', {
        $image: 'alpine',
        $env: {
          USER: 'bob'
        },
        $cmd: 'echo "Hello ${USER}"'
      }, {}, env, CONFIG, OPTIONS)
      expect(result).to.eql('Hello bob')
    })

    /**
     * Problem - we should move the secret capture/replace inside the "resolveCmdScript" function.
     * 
     * To test... subsequent $cmd scripts should not have access to eachothers secrets.
     * 
     */

    // Environment names that have the word "secret" in them, shall be treated as secrets...
    it('$cmd - with $image and $env and $envNames', async () => {
      // Given the secret USER env is "bob"...
      const env = new Environment()
      // N.B. we do not want to treat this as a "Final" script - so that we can capture the output (otherwise it is streamed to stdout)
      const IS_FINAL_SCRIPT = false
      // when we resolve the script...
      const result = await resolveCmdScript('-', {
        $env: {
          GREETING: 'Hola'
        },
        $envNames: ['secr'],
        $image: 'alpine',
        $cmd: 'echo "${GREETING} ${USER}"' // <-- !!! USER IS A SECRET, ONLY SHOULD ONLY BE USED TEMPORARILY !!!
      }, {}, env, CONFIG, OPTIONS, {}, IS_FINAL_SCRIPT)

      // then the output should be "Hola bob"...
      expect(result).to.eql('Hola bob')

      console.log('env', env)
      // and the global environment should now have "GREETING"
      // and the global environment should have the secret env "USER" defined in the "secret" environment
      expect(env.global).to.eql({})
      expect(env.resolved).to.eql({
        "-": "Hola bob",
        "GREETING": "Hola",
        "HOOKED_ROOT": "false",
        "USER": "bob"
      })
      expect(env.secrets).to.eql({})
    })
  })

})
