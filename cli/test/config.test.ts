/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import inquirer from 'inquirer'
import { describe } from 'mocha'
import sinon from 'sinon'
import { getEnvVarRefs, resolveEnv, stripProcessEnvs } from '../src/lib/config.js'
import { resolveCmdScript } from '../src/lib/scriptExecutors/ScriptExector.js'
import { type Config } from '../src/lib/types.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('config', () => {
  afterEach(() => {
    sinon.restore()
  })

  it('a full envNames should resolve #1', async () => {
    const config: Config = { env: { dogs: { foo: 'fido' }, cats: { foo: 'ginger' } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['dogs'], {}) // <- full envname
    expect(env).to.eql({ foo: 'fido' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['dogs'])
  })

  it('a full envNames should resolve #2', async () => {
    const config: Config = { env: { default: { foo: 'fido' }, cats: { foo: 'ginger' } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['cats'], {}) // <- full envname
    expect(env).to.eql({ foo: 'ginger' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['cats'])
  })

  it('a partial envNames should resolve', async () => {
    const config: Config = { env: { default: { foo: 'bar' } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['def'], {}) // <- partial name
    expect(env).to.eql({ foo: 'bar' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  it('an unknown envNames should throw an error', async () => {
    const config: Config = { env: { default: { foo: 'bar' } }, scripts: {} }
    await expect(resolveEnv(config, ['doesnotexist'], {})).to.be.rejectedWith('Environment not found: doesnotexist\nDid you mean?\n\t- default')
  })

  it('specifying two envNamess should load both', async () => {
    const config: Config = {
      env: {
        aaa: { aaa: '111', bbb: '222' },
        bbb: { aaa: '333', ccc: '444' },
        ccc: { ddd: '555' }
      },
      scripts: {}
    }
    const [env, stdin, envNames] = await resolveEnv(config, ['aaa', 'bbb', 'ccc'], {}) // <- partial name
    expect(env).to.eql({
      aaa: '333',
      bbb: '222',
      ccc: '444',
      ddd: '555'
    })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['aaa', 'bbb', 'ccc'])
  })

  it('if not required, stdin placeholders should be ignored', async () => {
    const config: Config = { env: { default: { bbb: 'xxx', ddd: 'zzz' } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], { aaa: '111' })
    expect(env).to.eql({ bbb: 'xxx', ddd: 'zzz' })
    expect(stdin).to.eql({ aaa: '111' })
    expect(envNames).to.eql(['default'])
  })

  it('defined env values should compliment and override global envs', async () => {
    const config: Config = { env: { default: { bbb: 'xxx', ddd: 'zzz' } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, { aaa: '111', bbb: '222', ccc: '333' })
    expect(env).to.eql({ aaa: '111', bbb: 'xxx', ccc: '333', ddd: 'zzz' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  it('env should resolve "string"', async () => {
    const config: Config = { env: { default: { foo: 'iamplainstring' } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
    expect(env).to.eql({ foo: 'iamplainstring' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  it('env should resolve $env', async () => {
    const config: Config = { env: { default: { username: { $env: 'USER' } } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, { USER: 'fred' })
    expect(env).to.eql({ username: 'fred', USER: 'fred' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  it('env should throw error if $env does not exist', async () => {
    const config: Config = { env: { default: { username: { $env: 'USER' } } }, scripts: {} }
    await expect(resolveEnv(config, ['default'], {}, {})).to.be.rejectedWith('Global environment variable not found: USER')
  })

  it('env should resolve $resolve', async () => {
    // eslint-disable-next-line no-template-curly-in-string
    const config: Config = { env: { default: { foo: 'bar', username: { $resolve: 'i-like-${foo}' } } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, {})
    expect(env).to.eql({ foo: 'bar', username: 'i-like-bar' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  it('env should resolve variables in order', async () => {
    const config: Config = {
      env: {
        default: {
          one: '1',
          two: { $resolve: '${one}-2' },
          three: { $resolve: '${two}-3' },
          four: { $resolve: '${three}-4' },
          five: { $resolve: '${four}-5' },
          six: { $resolve: '${five}-6' },
          seven: { $resolve: '${eight}-7' }, // will not resolve, eight has not yet been defined
          eight: { $resolve: '8' },
        }
      },
      scripts: {}
    }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {}, {})
    expect(env).to.eql({
      one: '1',
      two: '1-2',
      three: '1-2-3',
      four: '1-2-3-4',
      five: '1-2-3-4-5',
      six: '1-2-3-4-5-6',
      seven: '${eight}-7',
      eight: '8',
    })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  it('env should resolve $cmd', async () => {
    const config: Config = { env: { default: { foo: { $cmd: 'echo "bar"' } } }, scripts: {} }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
    expect(env).to.eql({ foo: 'bar' })
    expect(stdin).to.eql({})
    expect(envNames).to.eql(['default'])
  })

  it('env should throw error if $cmd exits with non-zero', async () => {
    const config: Config = { env: { default: { foo: { $cmd: 'notacommand' } } }, scripts: {} }
    await expect(resolveEnv(config, ['default'], {}, {})).to.be.rejectedWith(Error)
  })

  it('env should resolve $stdin', async () => {
    // stub
    const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
    // test
    const config: Config = { env: { default: { name: { $stdin: 'what is your name?' } } }, scripts: { } }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
    expect(env).to.eql({ name: 'jack' })
    expect(stdin).to.eql({ name: 'jack' })
    expect(envNames).to.eql(['default'])
    sinon.assert.calledOnce(inqspy)
  })

  it('env should resolve $stdin from defaults', async () => {
    // stub
    const inqspy = sinon.spy(inquirer, 'prompt')
    // test
    const config: Config = { env: { default: { name: { $stdin: 'what is your name?' } } }, scripts: { } }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], { name: 'fred' })
    expect(env).to.eql({ name: 'fred' })
    expect(stdin).to.eql({ name: 'fred' })
    expect(envNames).to.eql(['default'])
    sinon.assert.notCalled(inqspy)
  })

  it('$stdin should support $choices string array', async () => {
    // stub
    const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
    // test
    const config: Config = { env: { default: { name: { $stdin: 'what is your name?', $choices: ['one', 'two'] } } }, scripts: { } }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
    expect(env).to.eql({ name: 'jack' })
    expect(stdin).to.eql({ name: 'jack' })
    expect(envNames).to.eql(['default'])
    sinon.assert.calledOnceWithExactly(inqspy, [{
      type: 'list',
      name: 'name',
      message: 'what is your name?',
      default: undefined,
      choices: ['one', 'two']
    }])
  })

  it('$stdin should support $choices $cmd', async () => {
    // stub
    const inqspy = sinon.stub(inquirer, 'prompt').resolves({ name: 'jack' })
    // test
    const config: Config = { env: { default: { name: { $stdin: 'what is your name?', $choices: { $cmd: 'printf "one\ntwo\nthree\n"'} } } }, scripts: { } }
    const [env, stdin, envNames] = await resolveEnv(config, ['default'], {})
    expect(env).to.eql({ name: 'jack' })
    expect(stdin).to.eql({ name: 'jack' })
    expect(envNames).to.eql(['default'])
    sinon.assert.calledOnceWithExactly(inqspy, [{
      type: 'list',
      name: 'name',
      message: 'what is your name?',
      default: undefined,
      choices: ['one', 'two', 'three']
    }])
  })

  it('strip process envs', async () => {
    // same key and value? remove
    expect(stripProcessEnvs({ aaa: '111', bbb: '222' }, { aaa: '111' })).to.eql({ bbb: '222' })
    // same key, diff value? keep
    expect(stripProcessEnvs({ aaa: '111', bbb: '222' }, { aaa: '333' })).to.eql({ aaa: '111', bbb: '222' })
    // diff key? keep
    expect(stripProcessEnvs({ aaa: '111', bbb: '222' }, { ccc: '333' })).to.eql({ aaa: '111', bbb: '222' })
  })

  it('get env var refs', async () => {
    expect(getEnvVarRefs('')).to.eql([])
    expect(getEnvVarRefs('aaa')).to.eql([])
    expect(getEnvVarRefs('${aaa}')).to.eql(['aaa'])
    expect(getEnvVarRefs('aaa ${bbb} ccc')).to.eql(['bbb'])
    expect(getEnvVarRefs('aaa ${bbb} ccc ${ddd} eee')).to.eql(['bbb', 'ddd'])
    expect(getEnvVarRefs('aaa ${bbb} ccc ${ddd} eee ${bbb} ccc ${ddd} eee')).to.eql(['bbb', 'ddd'])
  })

  it('executing a $cmd with satisfied env should succeed', async () => {
    await expect(resolveCmdScript(undefined, { $cmd: 'echo "${HELLO}"' }, {}, { HELLO: "Hello" })).to.not.be.rejectedWith(Error)
  })
  it('executing a script with UNsatisfied env should fail', async () => {
    await expect(resolveCmdScript(undefined, { $cmd: 'echo "${HELLO}"' }, {}, { NOTHELLO: "Goodbye" })).to.be.rejectedWith('Script is missing required environment variables: ["HELLO"]')
  })
  it('executing a $cmd with "step defined" satisfied env should succeed', async () => {
    await expect(resolveCmdScript(undefined, { $cmd: 'echo "${HELLO}"', $env: { HELLO: 'Hola' } }, {}, {})).to.not.be.rejectedWith(Error)
  })
  it('executing a $cmd with "step defined" UNsatisfied env should fail', async () => {
    await expect(resolveCmdScript(undefined, { $cmd: 'echo "${HELLO}"', $env: { NOTHELLO: 'Adios' } }, {}, {})).to.be.rejectedWith('Script is missing required environment variables: ["HELLO"]')
  })
})
