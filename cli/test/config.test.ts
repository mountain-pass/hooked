/* eslint-disable no-template-curly-in-string */
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import inquirer from 'inquirer'
import { describe } from 'mocha'
import sinon from 'sinon'
import { _resolveAndMergeConfigurationWithImports, findScript, fetchGlobalEnvVars, resolveEnvironmentVariables } from '../src/lib/config.js'
import { resolveCmdScript } from '../src/lib/scriptExecutors/ScriptExecutor.js'
import { StdinResponses, type YamlConfig } from '../src/lib/types.js'
import { Environment, getEnvVarRefs } from '../src/lib/utils/Environment.js'
import YAML from 'yaml'
import child_process from 'child_process'
chai.use(chaiAsPromised)
const { expect } = chai
import os from 'os'
import path from 'path'
import fileUtils from '../src/lib/utils/fileUtils.js'
import defaults from '../src/lib/defaults.js'
import { ProgramOptions } from '../src/lib/program.js'

describe('config', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('find script should normalise strings when matching', async () => {
    // lowercase and normalise diacritics (accents)
    const inputScriptPath = ['FOO', 'CA ETE']
    const [script, scriptPath] = await findScript(
      { env: { default: { }}, scripts: { foo: { "Ça été Mičić": { $cmd: 'echo "FOO"'} }}}, 
      inputScriptPath, 
      { env: 'default', stdin: '{}', force: false }
    )
    expect(scriptPath).to.eql(['foo', "Ça été Mičić"])
  })

  it('default script prompt includes "_log_" for previous runs', async () => {

    const inqspy = sinon.stub(inquirer, 'prompt').resolves({ next: 'foo' })

    const [script, scriptPath] = await findScript({ env: { default: { }}, scripts: { foo: { $cmd: 'echo "FOO"'}}}, [], { env: 'default', stdin: '{}', force: false })

    sinon.assert.calledOnce(inqspy)
    const tmp = inqspy.args[0][0]
    expect(tmp).to.eql([
      {
        type: 'list',
        name: 'next',
        message: 'Please select an option:',
        pageSize: defaults.getDefaults().PAGE_SIZE,
        default: defaults.getDefaults().LOGS_MENU_OPTION,
        choices: [defaults.getDefaults().LOGS_MENU_OPTION, 'foo'],
        loop: true
      }
    ])
  })

  describe('envNames', () => {

    it('a full envNames should resolve #1', async () => {
      const config: YamlConfig = { env: { dogs: { foo: 'fido' }, cats: { foo: 'ginger' } }, scripts: {} }
      // const [env, stdin, envNames] = await resolveEnv(config, ['dogs'], {}) // <- full envname
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['dogs'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ foo: 'fido' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['dogs'])
    })

    it('a full envNames should resolve #2', async () => {
      const config: YamlConfig = { env: { default: { foo: 'fido' }, cats: { foo: 'ginger' } }, scripts: {} }
      // const [env, stdin, envNames] = await resolveEnv(config, ['cats'], {}) // <- full envname
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['cats'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ foo: 'ginger' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['cats'])
    })

    it('a partial envNames should resolve', async () => {
      const config: YamlConfig = { env: { default: { foo: 'bar' } }, scripts: {} }
      // const [env, stdin, envNames] = await resolveEnv(config, ['def'], {}) // <- partial name
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['def'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ foo: 'bar' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })

    it('an unknown envNames should throw an error', async () => {
      const config: YamlConfig = { env: { default: { foo: 'bar' } }, scripts: {} }
      await expect(fetchGlobalEnvVars(config, ['doesnotexist'])).to.be.rejectedWith('Environment not found: doesnotexist\nDid you mean?\n\t- default')
    })

    it('specifying two envNames should load both - 2 env names', async () => {
      const config: YamlConfig = {
        env: {
          aaa: { aaa: '111', bbb: '222' },
          bbb: { aaa: '333', ccc: '444' },
          ccc: { ddd: '555' }
        },
        scripts: {}
      }
      // const [env, stdin, envNames] = await resolveEnv(config, ['aaa', 'bbb'], {}) // <- partial name
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['aaa', 'bbb'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.global).to.eql({})
      expect(env.resolved).to.eql({
        aaa: '333',
        bbb: '222',
        ccc: '444'
      })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['aaa', 'bbb'])
    })

    it('specifying two envNames should load both - 3 env names', async () => {
      const config: YamlConfig = {
        env: {
          aaa: { aaa: '111', bbb: '222' },
          bbb: { aaa: '333', ccc: '444' },
          ccc: { ddd: '555' }
        },
        scripts: {}
      }
      // const [env, stdin, envNames] = await resolveEnv(config, ['aaa', 'bbb', 'ccc'], {}) // <- partial name
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['aaa', 'bbb', 'ccc'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.global).to.eql({})
      expect(env.resolved).to.eql({
        aaa: '333',
        bbb: '222',
        ccc: '444',
        ddd: '555'
      })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['aaa', 'bbb', 'ccc'])
    })

  })

  it('if not required, stdin placeholders should be ignored', async () => {
    const config: YamlConfig = { env: { default: { bbb: 'xxx', ddd: 'zzz' } }, scripts: {} }
    // const [env, stdin, envNames] = await resolveEnv(config, ['default'], { aaa: '111' })
    const stdin = { aaa: '111'}
    const env = new Environment()
    const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
    await resolveEnvironmentVariables(config, envVars, stdin, env)
    expect(env.resolved).to.eql({ bbb: 'xxx', ddd: 'zzz' })
    expect(stdin).to.eql({ aaa: '111' })
    expect(envNames).to.eql(['default'])
  })

  it('defined env values should compliment and override global envs', async () => {
    const config: YamlConfig = { env: { default: { bbb: 'xxx', ddd: 'zzz' } }, scripts: {} }
    // const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, new Environment({ aaa: '111', bbb: '222', ccc: '333' }))
    const stdin = {}
    const env = new Environment().putAllGlobal({ aaa: '111', bbb: '222', ccc: '333' })
    const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
    await resolveEnvironmentVariables(config, envVars, stdin, env)
    expect(env.resolved).to.eql({ bbb: 'xxx', ddd: 'zzz' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  describe('string', () => {

    it('env should resolve "string"', async () => {
      const config: YamlConfig = { env: { default: { foo: 'iamplainstring' } }, scripts: {} }
      // const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      const stdin = {}
      const env = new Environment().putAllGlobal({})
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ foo: 'iamplainstring' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })
  
    it('$env - env should resolve $env', async () => {
      const config: YamlConfig = { env: { default: { username: '${USER}' } }, scripts: {} }
      // const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, new Environment({ USER: 'fred' }))

    const stdin = {}
    const env = new Environment().putAllGlobal({ USER: 'fred' })
    const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
    await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ username: 'fred' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })
  
    it('$env - env should throw error if $env does not exist', async () => {
      const config: YamlConfig = { env: { default: { username: '${USER}' } }, scripts: {} }
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      // await resolveEnvironmentVariables(config, envVars, stdin, env)
      await expect(resolveEnvironmentVariables(config, envVars, stdin, env)).to.be.rejectedWith(`Environment 'username' is missing required environment variables: ["USER"]`)
    })
  
    it('$env - env should throw error if $env is blank', async () => {
      const config: YamlConfig = { env: { default: { USER: '', username: '${USER}' } }, scripts: {} }
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      // await resolveEnvironmentVariables(config, envVars, stdin, env)
      await expect(resolveEnvironmentVariables(config, envVars, stdin, env)).to.be.rejectedWith(`Environment 'username' is missing required environment variables: ["USER"]`)
    })
  
    it('$env - env should NOT throw error if $env is NOT blank', async () => {
      const config: YamlConfig = { env: { default: { USER: 'X', username: '${USER}' } }, scripts: {} }
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      expect(envVars).to.eql({
        USER: 'X',
        username: '${USER}'
      })
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({
        USER: 'X',
        username: 'X'
      })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })

    it('$resolve - env should resolve $resolve', async () => {
      // eslint-disable-next-line no-template-curly-in-string
      const config: YamlConfig = { env: { default: { foo: 'bar', username: 'i-like-${foo}' } }, scripts: {} }
      // const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, new Environment())
      const stdin = {}
      const env = new Environment().putAllGlobal({})
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ foo: 'bar', username: 'i-like-bar' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })

  })

  describe('$resolve', () => {

    it('order should not matter when resolving - part1 - single environment resolution', async () => {
      // will not resolve 'seven', because ${eight} has not yet been defined
      const config: YamlConfig = {
        env: {
          default: {
            one: '1',
            two: '${one}-2',
            three: '${two}-3',
            four: '${three}-4',
            five: '${four}-5',
            six: '${five}-6',
            seven: '${eight}-7',
            eight: '8',
          }
        },
        scripts: {}
      }
      // const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, new Environment())
      const stdin = {}
      const env = new Environment().putAllGlobal({ aaa: '111', bbb: '222', ccc: '333' })
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(envNames).to.eql(['default'])
      expect(env.resolved).to.eql({
        one: '1',
        two: '1-2',
        three: '1-2-3',
        four: '1-2-3-4',
        five: '1-2-3-4-5',
        six: '1-2-3-4-5-6',
        seven: '8-7',
        eight: '8',
      })
      // previously was be.rejectedWith(`Environment 'seven' is missing required environment variables: ["eight"]`)
    })

  })

  describe('$cmd', () => {

    const CONFIG: YamlConfig = {
      env: {
        default: {},
        secrets: {
          USER: 'bob'
        }
      },
      scripts: {}
    }

    const OPTIONS: ProgramOptions = {
      env: 'default',
      stdin: '{}',
      force: false
    }

    it('executing a $cmd with satisfied env should succeed', async () => {
      await expect(resolveCmdScript('-', { $cmd: 'echo "${HELLO}"' }, {}, new Environment().putAllGlobal({ HELLO: "Hello" }), CONFIG, OPTIONS)).to.not.be.rejectedWith(Error)
    })
    it('executing a script with UNsatisfied env should fail', async () => {
      await expect(resolveCmdScript('-', { $cmd: 'echo "${HELLO}"' }, {}, new Environment().putAllGlobal({ NOTHELLO: "Goodbye" }), CONFIG, OPTIONS)).to.be.rejectedWith(`Script '-' is missing required environment variables: ["HELLO"]`)
    })
    it('executing a $cmd with "step defined" satisfied env should succeed', async () => {
      const env = new Environment()
      env.putGlobal("HELLO", 'hi!')
      await expect(resolveCmdScript('-', { $cmd: 'echo "${HELLO}"' }, {}, env, CONFIG, OPTIONS)).to.not.be.rejectedWith(Error)
    })
    it('executing a $cmd with "step defined" UNsatisfied env should fail', async () => {
      await expect(resolveCmdScript('MYSCRIPT', { $cmd: 'echo "${HELLO}"' }, {}, new Environment(), CONFIG, OPTIONS)).to.be.rejectedWith(`Script 'MYSCRIPT' is missing required environment variables: ["HELLO"]`)
    })

    it('$cmd - env should resolve $cmd', async () => {
      const config: YamlConfig = { env: { default: { foo: { $envFromHost: false, $cmd: 'echo "bar"' } } }, scripts: {} }
      sinon.stub(child_process, 'execSync').returns('bar')
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      // check results
      expect(env.global).to.eql({})
      expect(env.resolved).to.eql({ HOOKED_ROOT: "false", foo: 'bar' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })

    it('$cmd - env should throw error if $cmd exits with non-zero', async () => {
      const config: YamlConfig = { env: { default: { foo: { $cmd: 'notacommand' } } }, scripts: {} }
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await expect(resolveEnvironmentVariables(config, envVars, stdin, env)).to.be.rejectedWith(Error)
    })

  })

  describe('$ask', () => {

    it('$ask - env should resolve $ask', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: YamlConfig = { env: { default: { name: { $ask: 'what is your name?' } } }, scripts: { } }
      // const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      const stdin = {}
      const env = new Environment().putAllGlobal({ aaa: '111', bbb: '222', ccc: '333' })
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnce(inqspy)
    })

    it('$ask - $ask value should resolve env vars', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: YamlConfig = { env: { default: { name: { $ask: 'Is your name "${USER}"?' } } }, scripts: { } }
      const env = new Environment().putAllGlobal({ USER: 'jill' })
      const stdin = {}
      const [envVars] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      sinon.assert.calledOnceWithExactly(inqspy, [ {
        type: 'text',
        name: 'name',
        message: 'Is your name "jill"?',
        pageSize: 10,
        default: undefined,
        choices: undefined,
        loop: true
      }])
    })

    it('$ask - $default value should resolve env vars', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: YamlConfig = { env: { default: { name: { $ask: 'Is your name ...?', $default: '${USER}' } } }, scripts: { } }
      const stdin = {}
      const env = new Environment().putAllGlobal({ USER: 'jill' })
      const [envVars] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      sinon.assert.calledOnceWithExactly(inqspy, [ {
        type: 'text',
        name: 'name',
        message: 'Is your name ...?',
        pageSize: 10,
        default: 'jill',
        choices: undefined,
        loop: true
      }])
    })

    it('$ask - env should resolve $ask from defaults', async () => {
      // stub
      const inqspy = sinon.spy(inquirer, 'prompt')
      // test
      const config: YamlConfig = { env: { default: { name: { $ask: 'what is your name?' } } }, scripts: { } }
      // const [env, stdin, envNames] = await resolveEnv(config, ['default'], { name: 'fred' })
    const stdin = { name: 'fred' }
    const env = new Environment().putAllGlobal({ aaa: '111', bbb: '222', ccc: '333' })
    const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
    await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ name: 'fred' })
      expect(stdin).to.eql({ name: 'fred' })
      expect(envNames).to.eql(['default'])
      sinon.assert.notCalled(inqspy)
    })

    it('$ask - $ask should support $choices string array', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: YamlConfig = { env: { default: { name: { $ask: 'what is your name?', $choices: ['one', 'two'] } } }, scripts: { } }
      // const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      const stdin = {}
      const env = new Environment().putAllGlobal({ aaa: '111', bbb: '222', ccc: '333' })
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnceWithExactly(inqspy, [{
        type: 'list',
        name: 'name',
        message: 'what is your name?',
        pageSize: defaults.getDefaults().PAGE_SIZE,
        default: undefined,
        choices: [
          {name: 'one', value: 'one'}, 
          {name: 'two', value: 'two'}
        ],
        loop: true
      }])
    })

    it('$ask - $ask should support $choices boolean array', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: YamlConfig = { env: { default: { name: { $ask: 'what is your name?', $choices: [true, false] } } }, scripts: { } }
      // const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      const stdin = {}
      const env = new Environment().putAllGlobal({ aaa: '111', bbb: '222', ccc: '333' })
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnceWithExactly(inqspy, [{
        type: 'list',
        name: 'name',
        message: 'what is your name?',
        pageSize: defaults.getDefaults().PAGE_SIZE,
        default: undefined,
        choices: [
        {name:'true',value:'true'}, 
        {name:'false',value:'false'}
        ],
        loop: true
      }])
    })

    it('$ask - $ask should support $choices number array', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: YamlConfig = { env: { default: { name: { $ask: 'what is your name?', $choices: [1,2,3] } } }, scripts: { } }
      
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      expect(env.resolved).to.eql({ name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnceWithExactly(inqspy, [{
        type: 'list',
        name: 'name',
        message: 'what is your name?',
        pageSize: defaults.getDefaults().PAGE_SIZE,
        default: undefined,
        choices: [
          { name: '1', value: '1' },
          { name: '2', value: '2' },
          { name: '3', value: '3' },
        ],
        loop: true
      }])
    })

    it('$ask - $ask should support $choices $cmd', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: YamlConfig = { env: { default: { name: { $ask: 'what is your name?', $choices: { $envFromHost: false, $cmd: 'printf "one\ntwo\nthree\n"'} } } }, scripts: { } }
      
      const stdin = {}
      const env = new Environment()
      const [envVars, envNames] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      // assert
      sinon.assert.calledOnceWithExactly(inqspy, [{
        type: 'list',
        name: 'name',
        message: 'what is your name?',
        pageSize: defaults.getDefaults().PAGE_SIZE,
        default: undefined,
        choices: [{ name: 'one', value: 'one' }, { name: 'two', value: 'two' }, { name: 'three', value: 'three' }],
        loop: true
      }])
      expect(env.global).to.eql({  })
      expect(env.resolved).to.eql({ HOOKED_ROOT: "false", name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
    })

  })

  // it('strip process envs', async () => {
  //   // same key and value? remove
  //   expect(stripProcessEnvs({ aaa: '111', bbb: '222' }, { aaa: '111' })).to.eql({ bbb: '222' })
  //   // same key, diff value? keep
  //   expect(stripProcessEnvs({ aaa: '111', bbb: '222' }, { aaa: '333' })).to.eql({ aaa: '111', bbb: '222' })
  //   // diff key? keep
  //   expect(stripProcessEnvs({ aaa: '111', bbb: '222' }, { ccc: '333' })).to.eql({ aaa: '111', bbb: '222' })
  // })

  it('get env var refs', async () => {
    expect(getEnvVarRefs('')).to.eql([])
    expect(getEnvVarRefs('aaa')).to.eql([])
    expect(getEnvVarRefs('${aaa}')).to.eql(['aaa'])
    expect(getEnvVarRefs('aaa ${bbb} ccc')).to.eql(['bbb'])
    expect(getEnvVarRefs('aaa ${bbb} ccc ${ddd} eee')).to.eql(['bbb', 'ddd'])
    expect(getEnvVarRefs('aaa ${bbb} ccc ${ddd} eee ${bbb} ccc ${ddd} eee')).to.eql(['bbb', 'ddd'])
  })

  it('base config with only scripts is valid', async () => {
    // resolve environment, and returned resovled values...
    const tmp = async (config: YamlConfig, envNames: string[], stdin: StdinResponses) => {
      // const [env, stdinOut, envNamesOut] = await resolveEnv(config, envNames, stdin, new Environment())

      const env = new Environment()
      const [envVars, envs] = await fetchGlobalEnvVars(config, ['default'])
      await resolveEnvironmentVariables(config, envVars, stdin, env)
      return [env.resolved, envNames]
    }
    await expect(tmp({ } as any, ['default'], {}), '#1').to.not.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null } as any, ['default'], {}), '#2').to.not.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: {} } as any, ['default'], {}), '#3').to.not.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: [] } as any, ['default'], {}), '#4').to.not.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, imports: null } as any, ['default'], {}), '#5').to.not.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, imports: {} } as any, ['default'], {}), '#6').to.not.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, imports: [] } as any, ['default'], {}), '#7').to.not.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, env: null } as any, ['default'], {}), '#8').to.not.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, env: {} } as any, ['default'], {}), '#9').to.eventually.eql([{}, ['default']])
    await expect(tmp({ scripts: null, env: [] } as any, ['default'], {}), '#10').to.eventually.eql([{}, ['default']])
    await expect(tmp({ scripts: null, env: { default: null } } as any, ['default'], {}), '#11').to.eventually.eql([{}, ['default']])
    await expect(tmp({ scripts: null, env: { default: {} } } as any, ['default'], {}), '#12').to.eventually.eql([{}, ['default']])
    await expect(tmp({ scripts: null, env: { default: [] } } as any, ['default'], {}), '#13').to.eventually.eql([{}, ['default']])
  })

  describe('yaml config', () => {

    it('base config should allow string, number and boolean', async () => {
      // setup
      const importedConfig: YamlConfig = { 
        env: { default: { aaa: 'zzz', bbb: 123 as any, ccc: true as any } }, 
        scripts: { 
          hello: { $cmd: 'echo "Hello"' }
        }
      }
      // stub reading the ~/.hooked/hooked.yaml file...
      const spyFsExistsSync = sinon.stub(fs, 'existsSync').returns(true)
      const spyFsReadFileSync = sinon.stub(fs, 'readFileSync').returns(YAML.stringify(importedConfig))
      // test
      const rootConfig = { 
        imports: ['~/.hooked/hooked.yaml'],
        env: { default: { ddd: 'yyy' } },
        scripts: {
          goodbye: { $cmd: 'echo "Goodbye"' }
        }
      } as YamlConfig
      // process imports...
      await _resolveAndMergeConfigurationWithImports(rootConfig)

      const stdin = {}
      const env = new Environment()
      const [envVars, envs] = await fetchGlobalEnvVars(rootConfig, ['default'])
      await resolveEnvironmentVariables(rootConfig, envVars, stdin, env)
      
      expect([env.resolved, stdin, envs]).to.eql([{
        aaa: 'zzz',
        bbb: '123',
        ccc: 'true',
        ddd: 'yyy',
      }, {}, ['default']])
      // assert
      expect(rootConfig.scripts).to.eql({
        hello: { "_scriptPath": "hello", "_scriptPathArray": ["hello"], $cmd: 'echo "Hello"' },
        goodbye: { $cmd: 'echo "Goodbye"' } // <- config was not loaded, thus missing "_scriptPath": "goodbye", 
      })
      sinon.assert.calledThrice(spyFsExistsSync)
      const argument = spyFsExistsSync.getCall(0).args[0]
      expect(argument).to.eql(path.join(os.homedir(), '.hooked', 'hooked.yaml'))
      sinon.assert.calledOnce(spyFsReadFileSync)
    })

    it('base config with remote https:// imports works', async () => {
      // setup
      const importedConfig: YamlConfig = { 
        env: { default: { bbb: { $envFromHost: false, $cmd: 'echo "222"' } } }, 
        scripts: { 
          hello: { $cmd: 'echo "Hello"' }
        }
      }
      let count = 0
      const fsspy1 = sinon.stub(fs, 'existsSync').callsFake((path: any) => {
        if (path.endsWith('custom.yaml')) {
          return count++ === 0 ? false : true
        }
        return true
      })
      const fsspy2 = sinon.stub(fs, 'readFileSync').returns(YAML.stringify(importedConfig))
      const fsspy3 = sinon.stub(fileUtils, 'downloadFile').resolves(true)
      // test
      const rootConfig = { 
        imports: ['https://www.foobar.com/.hooked/custom.yaml'],
        env: { default: { aaa: { $envFromHost: false, $cmd: 'echo "111"' } } },
        scripts: {
          goodbye: { $cmd: 'echo "Goodbye"' }
        },
      } as YamlConfig
      // process imports...
      await _resolveAndMergeConfigurationWithImports(rootConfig)
      const stdin = {}
      const env = new Environment()
      const [envVars, envs] = await fetchGlobalEnvVars(rootConfig, ['default'])
      await resolveEnvironmentVariables(rootConfig, envVars, stdin, env)
      expect(env.global).to.eql({})
      expect(env.resolved).to.eql({
        HOOKED_ROOT: "false",
        bbb: '222',
        aaa: '111'
      })
      expect(envs).to.eql(['default'])
      // assert
      expect(rootConfig.scripts).to.eql({
        hello: { "_scriptPath": "hello", "_scriptPathArray": ["hello"], $cmd: 'echo "Hello"' },
        goodbye: { $cmd: 'echo "Goodbye"' } // <- config was not loaded, thus missing "_scriptPath": "goodbye", 
      })
      sinon.assert.calledWithExactly(fsspy1, path.join(os.homedir(), '.hooked', 'imports', 'custom.yaml'))
      sinon.assert.calledOnce(fsspy2)
      sinon.assert.calledOnceWithExactly(fsspy3, 'https://www.foobar.com/.hooked/custom.yaml', defaults.getLocalImportsCachePath('custom.yaml'))
    })

  })
})
