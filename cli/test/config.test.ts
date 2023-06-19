/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import inquirer from 'inquirer'
import { describe } from 'mocha'
import sinon from 'sinon'
import { _resolveAndMergeConfigurationWithImports, findScript, resolveEnv } from '../src/lib/config.js'
import { resolveCmdScript } from '../src/lib/scriptExecutors/ScriptExector.js'
import { StdinResponses, type Config } from '../src/lib/types.js'
import { Environment, getEnvVarRefs } from '../src/lib/utils/Environment.js'
import YAML from 'yaml'
import child_process from 'child_process'
chai.use(chaiAsPromised)
const { expect } = chai
import os from 'os'
import path from 'path'
import fileUtils from '../src/lib/utils/fileUtils.js'
import { LOGS_MENU_OPTION, PAGE_SIZE, getLocalImportsCachePath } from '../src/lib/defaults.js'
import { Options } from '../src/lib/program.js'

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
      { env: 'default', stdin: '{}' }
    )
    expect(scriptPath).to.eql(['foo', "Ça été Mičić"])
  })

  it('default script prompt includes "_log_" for previous runs', async () => {

    const inqspy = sinon.stub(inquirer, 'prompt').resolves({ next: 'foo' })

    const [script, scriptPath] = await findScript({ env: { default: { }}, scripts: { foo: { $cmd: 'echo "FOO"'}}}, [], { env: 'default', stdin: '{}' })

    sinon.assert.calledOnceWithExactly(inqspy, [
      {
        type: 'rawlist',
        name: 'next',
        message: 'Please select an option:',
        pageSize: PAGE_SIZE,
        default: LOGS_MENU_OPTION,
        choices: [LOGS_MENU_OPTION, 'foo'],
        loop: true
      }
    ])
  })

  describe('envNames', () => {

    it('a full envNames should resolve #1', async () => {
      const config: Config = { env: { dogs: { foo: 'fido' }, cats: { foo: 'ginger' } }, scripts: {} }
      const [env, stdin, envNames] = await resolveEnv(config, ['dogs'], {}) // <- full envname
      expect(env.resolved).to.eql({ foo: 'fido' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['dogs'])
    })

    it('a full envNames should resolve #2', async () => {
      const config: Config = { env: { default: { foo: 'fido' }, cats: { foo: 'ginger' } }, scripts: {} }
      const [env, stdin, envNames] = await resolveEnv(config, ['cats'], {}) // <- full envname
      expect(env.resolved).to.eql({ foo: 'ginger' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['cats'])
    })

    it('a partial envNames should resolve', async () => {
      const config: Config = { env: { default: { foo: 'bar' } }, scripts: {} }
      const [env, stdin, envNames] = await resolveEnv(config, ['def'], {}) // <- partial name
      expect(env.resolved).to.eql({ foo: 'bar' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })

    it('an unknown envNames should throw an error', async () => {
      const config: Config = { env: { default: { foo: 'bar' } }, scripts: {} }
      await expect(resolveEnv(config, ['doesnotexist'], {})).to.be.rejectedWith('Environment not found: doesnotexist\nDid you mean?\n\t- default')
    })

    it('specifying two envNames should load both - 2 env names', async () => {
      const config: Config = {
        env: {
          aaa: { aaa: '111', bbb: '222' },
          bbb: { aaa: '333', ccc: '444' },
          ccc: { ddd: '555' }
        },
        scripts: {}
      }
      const [env, stdin, envNames] = await resolveEnv(config, ['aaa', 'bbb'], {}) // <- partial name
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
      const config: Config = {
        env: {
          aaa: { aaa: '111', bbb: '222' },
          bbb: { aaa: '333', ccc: '444' },
          ccc: { ddd: '555' }
        },
        scripts: {}
      }
      const [env, stdin, envNames] = await resolveEnv(config, ['aaa', 'bbb', 'ccc'], {}) // <- partial name
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
    const config: Config = { env: { default: { bbb: 'xxx', ddd: 'zzz' } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], { aaa: '111' })
    expect(env.resolved).to.eql({ bbb: 'xxx', ddd: 'zzz' })
    expect(stdin).to.eql({ aaa: '111' })
    expect(envNames).to.eql(['default'])
  })

  it('defined env values should compliment and override global envs', async () => {
    const config: Config = { env: { default: { bbb: 'xxx', ddd: 'zzz' } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, new Environment({ aaa: '111', bbb: '222', ccc: '333' }))
    expect(env.resolved).to.eql({ bbb: 'xxx', ddd: 'zzz' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  describe('string', () => {

    it('env should resolve "string"', async () => {
      const config: Config = { env: { default: { foo: 'iamplainstring' } }, scripts: {} }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      expect(env.resolved).to.eql({ foo: 'iamplainstring' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })
  
    it('$env - env should resolve $env', async () => {
      const config: Config = { env: { default: { username: '${USER}' } }, scripts: {} }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, new Environment({ USER: 'fred' }))
      expect(env.resolved).to.eql({ username: 'fred' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })
  
    it('$env - env should throw error if $env does not exist', async () => {
      const config: Config = { env: { default: { username: '${USER}' } }, scripts: {} }
      await expect(resolveEnv(config, ['default'], {}, new Environment())).to.be.rejectedWith(`Environment 'username' is missing required environment variables: ["USER"]`)
    })

    it('$resolve - env should resolve $resolve', async () => {
      // eslint-disable-next-line no-template-curly-in-string
      const config: Config = { env: { default: { foo: 'bar', username: 'i-like-${foo}' } }, scripts: {} }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, new Environment())
      expect(env.resolved).to.eql({ foo: 'bar', username: 'i-like-bar' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })

  })

  describe('$resolve', () => {

    it('order should not matter when resolving - part1 - single environment resolution', async () => {
      // will not resolve 'seven', because ${eight} has not yet been defined
      const config: Config = {
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
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, new Environment())
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

    it.skip('order should not matter when resolving - part2 - multiple environment resolution', () => {})

  })

  describe('$cmd', () => {

    const CONFIG: Config = {
      env: {
        default: {},
        secrets: {
          USER: 'bob'
        }
      },
      scripts: {}
    }

    const OPTIONS: Options = {
      env: 'default',
      stdin: '{}'
    }

    it('executing a $cmd with satisfied env should succeed', async () => {
      await expect(resolveCmdScript(undefined, { $cmd: 'echo "${HELLO}"' }, {}, new Environment({ HELLO: "Hello" }), CONFIG, OPTIONS)).to.not.be.rejectedWith(Error)
    })
    it('executing a script with UNsatisfied env should fail', async () => {
      await expect(resolveCmdScript(undefined, { $cmd: 'echo "${HELLO}"' }, {}, new Environment({ NOTHELLO: "Goodbye" }), CONFIG, OPTIONS)).to.be.rejectedWith('Script is missing required environment variables: ["HELLO"]')
    })
    it('executing a $cmd with "step defined" satisfied env should succeed', async () => {
      await expect(resolveCmdScript(undefined, { $cmd: 'echo "${HELLO}"', $env: { HELLO: 'Hola' } }, {}, new Environment(), CONFIG, OPTIONS)).to.not.be.rejectedWith(Error)
    })
    it('executing a $cmd with "step defined" UNsatisfied env should fail', async () => {
      await expect(resolveCmdScript(undefined, { $cmd: 'echo "${HELLO}"', $env: { NOTHELLO: 'Adios' } }, {}, new Environment(), CONFIG, OPTIONS)).to.be.rejectedWith('Script is missing required environment variables: ["HELLO"]')
    })

    it('$cmd - env should resolve $cmd', async () => {
      const config: Config = { env: { default: { foo: { $cmd: 'echo "bar"' } } }, scripts: {} }
      sinon.stub(child_process, 'execSync').returns('bar')
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      // check results
      expect(env.global).to.eql({})
      expect(env.resolved).to.eql({ HOOKED_ROOT: "false", foo: 'bar' })
      expect(stdin).to.eql({})
      expect(envNames).to.eql(['default'])
    })

    it('$cmd - env should throw error if $cmd exits with non-zero', async () => {
      const config: Config = { env: { default: { foo: { $cmd: 'notacommand' } } }, scripts: {} }
      await expect(resolveEnv(config, ['default'], {}, new Environment())).to.be.rejectedWith(Error)
    })

  })

  describe('$stdin', () => {

    it('$stdin - env should resolve $stdin', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: Config = { env: { default: { name: { $stdin: 'what is your name?' } } }, scripts: { } }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      expect(env.resolved).to.eql({ name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnce(inqspy)
    })

    it('$stdin - $stdin value should resolve env vars', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: Config = { env: { default: { name: { $stdin: 'Is your name "${USER}"?' } } }, scripts: { } }
      await resolveEnv(config, ['default'], {}, new Environment({ USER: 'jill' }))
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

    it('$stdin - $default value should resolve env vars', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: Config = { env: { default: { name: { $stdin: 'Is your name ...?', $default: '${USER}' } } }, scripts: { } }
      await resolveEnv(config, ['default'], {}, new Environment({ USER: 'jill' }))
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

    it('$stdin - env should resolve $stdin from defaults', async () => {
      // stub
      const inqspy = sinon.spy(inquirer, 'prompt')
      // test
      const config: Config = { env: { default: { name: { $stdin: 'what is your name?' } } }, scripts: { } }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], { name: 'fred' })
      expect(env.resolved).to.eql({ name: 'fred' })
      expect(stdin).to.eql({ name: 'fred' })
      expect(envNames).to.eql(['default'])
      sinon.assert.notCalled(inqspy)
    })

    it('$stdin - $stdin should support $choices string array', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: Config = { env: { default: { name: { $stdin: 'what is your name?', $choices: ['one', 'two'] } } }, scripts: { } }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      expect(env.resolved).to.eql({ name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnceWithExactly(inqspy, [{
        type: 'rawlist',
        name: 'name',
        message: 'what is your name?',
        pageSize: PAGE_SIZE,
        default: undefined,
        choices: [
          {name: 'one', value: 'one'}, 
          {name: 'two', value: 'two'}
        ],
        loop: true
      }])
    })

    it('$stdin - $stdin should support $choices boolean array', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: Config = { env: { default: { name: { $stdin: 'what is your name?', $choices: [true, false] } } }, scripts: { } }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      expect(env.resolved).to.eql({ name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnceWithExactly(inqspy, [{
        type: 'rawlist',
        name: 'name',
        message: 'what is your name?',
        pageSize: PAGE_SIZE,
        default: undefined,
        choices: [
        {name:'true',value:'true'}, 
        {name:'false',value:'false'}
        ],
        loop: true
      }])
    })

    it('$stdin - $stdin should support $choices number array', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: Config = { env: { default: { name: { $stdin: 'what is your name?', $choices: [1,2,3] } } }, scripts: { } }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      expect(env.resolved).to.eql({ name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnceWithExactly(inqspy, [{
        type: 'rawlist',
        name: 'name',
        message: 'what is your name?',
        pageSize: PAGE_SIZE,
        default: undefined,
        choices: [
          { name: '1', value: '1' },
          { name: '2', value: '2' },
          { name: '3', value: '3' },
        ],
        loop: true
      }])
    })

    it('$stdin - $stdin should support $choices $cmd', async () => {
      // stub
      const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
      // test
      const config: Config = { env: { default: { name: { $stdin: 'what is your name?', $choices: { $cmd: 'printf "one\ntwo\nthree\n"'} } } }, scripts: { } }
      const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
      expect(env.global).to.eql({  })
      expect(env.resolved).to.eql({ HOOKED_ROOT: "false", name: 'jack' })
      expect(stdin).to.eql({ name: 'jack' })
      expect(envNames).to.eql(['default'])
      sinon.assert.calledOnceWithExactly(inqspy, [{
        type: 'rawlist',
        name: 'name',
        message: 'what is your name?',
        pageSize: PAGE_SIZE,
        default: undefined,
        choices: ['one', 'two', 'three'],
        loop: true
      }])
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
    const tmp = async (config: Config, envNames: string[], stdin: StdinResponses) => {
      const [env, stdinOut, envNamesOut] = await resolveEnv(config, envNames, stdin, new Environment())
      return [env.resolved, stdinOut, envNamesOut]
    }
    await expect(tmp({ } as any, ['default'], {})).to.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null } as any, ['default'], {})).to.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: {} } as any, ['default'], {})).to.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: [] } as any, ['default'], {})).to.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, imports: null } as any, ['default'], {})).to.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, imports: {} } as any, ['default'], {})).to.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, imports: [] } as any, ['default'], {})).to.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, env: null } as any, ['default'], {})).to.be.rejectedWith(`No environments found in config. Must have at least one environment.`)
    await expect(tmp({ scripts: null, env: {} } as any, ['default'], {})).to.be.rejectedWith('Environment not found: default\nDid you mean?')
    await expect(tmp({ scripts: null, env: [] } as any, ['default'], {})).to.be.rejectedWith('Environment not found: default\nDid you mean?')
    await expect(tmp({ scripts: null, env: { default: null } } as any, ['default'], {})).to.eventually.eql([{}, {}, ['default']])
    await expect(tmp({ scripts: null, env: { default: {} } } as any, ['default'], {})).to.eventually.eql([{}, {}, ['default']])
    await expect(tmp({ scripts: null, env: { default: [] } } as any, ['default'], {})).to.eventually.eql([{}, {}, ['default']])
  })

  describe('yaml config', () => {

    it('base config should allow string, number and boolean', async () => {
      // setup
      const importedConfig: Config = { 
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
      } as Config
      // process imports...
      await _resolveAndMergeConfigurationWithImports(rootConfig)

      const [env, stdin, envs] = await resolveEnv(rootConfig, ['default'], {}, new Environment())
      expect([env.resolved, stdin, envs]).to.eql([{
        aaa: 'zzz',
        bbb: '123',
        ccc: 'true',
        ddd: 'yyy',
      }, {}, ['default']])
      // assert
      expect(rootConfig.scripts).to.eql({
        hello: { $cmd: 'echo "Hello"' },
        goodbye: { $cmd: 'echo "Goodbye"' }
      })
      sinon.assert.calledWithExactly(spyFsExistsSync, path.join(os.homedir(), '.hooked', 'hooked.yaml'))
      sinon.assert.calledOnce(spyFsReadFileSync)
    })

    it('base config with remote https:// imports works', async () => {
      // setup
      const importedConfig: Config = { 
        env: { default: { bbb: { $cmd: 'echo "222"' } } }, 
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
        env: { default: { aaa: { $cmd: 'echo "111"' } } },
        scripts: {
          goodbye: { $cmd: 'echo "Goodbye"' }
        },
      } as Config
      // process imports...
      await _resolveAndMergeConfigurationWithImports(rootConfig)
      const [env, stdin, envs] = await resolveEnv(rootConfig, ['default'], {}, new Environment())
      expect(env.global).to.eql({})
      expect(env.resolved).to.eql({
        HOOKED_ROOT: "false",
        bbb: '222',
        aaa: '111'
      })
      expect(stdin).to.eql({})
      expect(envs).to.eql(['default'])
      // assert
      expect(rootConfig.scripts).to.eql({
        hello: { $cmd: 'echo "Hello"' },
        goodbye: { $cmd: 'echo "Goodbye"' }
      })
      sinon.assert.calledWithExactly(fsspy1, path.join(os.homedir(), '.hooked', 'imports', 'custom.yaml'))
      sinon.assert.calledOnce(fsspy2)
      sinon.assert.calledOnceWithExactly(fsspy3, 'https://www.foobar.com/.hooked/custom.yaml', getLocalImportsCachePath('custom.yaml'))
    })

  })
})
