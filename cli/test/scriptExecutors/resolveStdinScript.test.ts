/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import inquirer from 'inquirer'
import { describe } from 'mocha'
import sinon from 'sinon'
import { resolveStdinScript } from '../../src/lib/scriptExecutors/ScriptExecutor.js'
import { Environment } from '../../src/lib/utils/Environment.js'
import { InternalScript, StdinScript } from '../../src/lib/types.js'

chai.use(chaiAsPromised)
const { expect } = chai


describe('resolveStdinScript', () => {

  afterEach(() => {
    sinon.restore()
  })

  describe('no options', () => {

    it('should accept just $ask', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:" }, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'text',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: undefined,
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a newline delimited string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: "Bob\nAlice\nCharlie" }, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: 'Bob', value: 'Bob' }, { name: 'Alice', value: 'Alice' }, { name: 'Charlie', value: 'Charlie' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a string[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: ["Bob", "Alice", "Charlie"] } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: 'Bob', value: 'Bob' }, { name: 'Alice', value: 'Alice' }, { name: 'Charlie', value: 'Charlie' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a boolean[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: [true, false] } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: 'true', value: 'true' }, { name: 'false', value: 'false' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a number[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: [1,2,3] } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: '1', value: '1' }, { name: '2', value: '2' }, { name: '3', value: '3' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a string|boolean|number[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: ['foo',true,3] } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: 'foo', value: 'foo' }, { name: 'true', value: 'true' }, { name: '3', value: '3' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a {name,value}[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: [{ name: 'yes', value: 'true' }, { name: 'no', value: 'false' }] } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: 'yes', value: 'true' }, { name: 'no', value: 'false' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a {key,value}', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: { yes: 'true', no: 'false' } } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: 'yes', value: 'true' }, { name: 'no', value: 'false' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a Script object that returns a newline string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => "foo\ntrue\n3" }
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: choicesScript } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: "foo", value: "foo" },  { name: "true", value: "true" }, { name: "3", value: "3" }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a Script object that returns a json array object[] string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => '[{ "name": "foo", "value": "foo" }, { "name": "true", "value": "true" }, { "name": "3", "value": "3" }]' }
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: choicesScript } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: 'foo', value: 'foo' }, { name: 'true', value: 'true' }, { name: '3', value: '3' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a Script object that returns a json object string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => '{ "yes": "true", "no": "false" }' }
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: choicesScript } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: 'yes', value: 'true' }, { name: 'no', value: 'false' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a Script object that returns a json string[] string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => '["Bob", "Alice", "Charlie"]' }
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: choicesScript } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: undefined,
        choices: [{ name: "Bob", value: "Bob" }, { name: "Alice", value: "Alice" }, { name: "Charlie", value: "Charlie" }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

  })

  // FILTER AND DEFAULTS AND SORT

  describe('filters, defaults and sort', () => {


    it('should accept just $ask', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $default: 'Bob' }, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'text',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'Bob',
        choices: undefined,
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a newline delimited string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: "Bob\nAlice\nCharlie", $default: 'Bob', $filter: '/bob|alice/i', $sort: 'alpha' }, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'Bob',
        choices: [{ name: 'Alice', value: 'Alice' }, { name: 'Bob', value: 'Bob' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a string[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: ["Bob", "Alice", "Charlie"], $default: 'Bob', $filter: '/bob|alice/i', $sort: 'alpha' } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'Bob',
        choices: [{ name: 'Alice', value: 'Alice' }, { name: 'Bob', value: 'Bob' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a boolean[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: [true, false], $default: 'true', $filter: '/true/i', $sort: 'alpha' } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'true',
        choices: [{ name: 'true', value: 'true' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a number[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: [1,2,3], $default: '3', $filter: '/3/i', $sort: 'alpha' } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: '3',
        choices: [{ name: '3', value: '3' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a string|boolean|number[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: ['foo',true,3], $default: 'foo', $filter: '/foo|true/i', $sort: 'alpha' } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'foo',
        choices: [{ name: 'foo', value: 'foo' }, { name: 'true', value: 'true' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a {name,value}[]', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: [{ name: 'yes', value: 'true' }, { name: 'no', value: 'false' }], $default: 'yes', $filter: '/yes/i', $sort: 'alpha' } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'yes',
        choices: [{ name: 'yes', value: 'true' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a {key,value}', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: { yes: 'true', no: 'false' }, $default: 'yes', $filter: '/yes/i', $sort: 'alpha' } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'yes',
        choices: [{ name: 'yes', value: 'true' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a Script object that returns a newline string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => "foo\ntrue\n3" }
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: choicesScript, $default: 'foo', $filter: '/foo/i', $sort: 'alpha' } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'foo',
        choices: [{ name: "foo", value: "foo" }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a Script object that returns a json array object[] string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => '[{ "name": "foo", "value": "foo" }, { "name": "true", "value": "true" }, { "name": "3", "value": "3" }]' }
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: choicesScript, $default: 'foo', $filter: '/foo/i', $sort: 'alpha' }, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'foo',
        choices: [{ name: 'foo', value: 'foo' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a Script object that returns a json object string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => '{ "yes": "true", "no": "false" }' }
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: choicesScript, $default: 'yes', $filter: '/yes/i', $sort: 'alpha' }, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'yes',
        choices: [{ name: 'yes', value: 'true' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

    it('should accept $choices as a Script object that returns a json string[] string', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => '["Bob", "Alice", "Charlie"]' }
      await resolveStdinScript("name", { $ask: "What is your name?:", $choices: choicesScript, $default: 'Bob', $filter: '/bob|alice/i', $sort: 'alpha' } as StdinScript, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'Bob',
        choices: [{ name: "Alice", value: "Alice" }, { name: "Bob", value: "Bob" }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })

  })
  
  // FIELD MAPPINGS

  describe('field mappings', () => {

    it('json array object, can have $fieldMappings to logical names', async () => {
      const inqStub = sinon.stub(inquirer, 'prompt').resolves({ name: 'Alice' })
      const stdinResponses: any = {}
      const choicesScript: InternalScript = { $internal: async () => '[{ "id": "foo", "label": "foo" }, { "id": "true", "label": "true" }, { "id": "3", "label": "3" }]' }
      await resolveStdinScript("name", {
        $ask: "What is your name?:",
        $choices: choicesScript,
        $default: 'foo',
        $filter: '/foo/i',
        $fieldsMapping:{
          name: 'id',
          value: 'label'
        },
        $sort: 'alpha'
      }, stdinResponses, new Environment(), {} as any, {} as any, {})
      sinon.assert.calledOnceWithExactly(inqStub, [{
        type: 'list',
        name: 'name',
        message: 'What is your name?:',
        pageSize: 10,
        default: 'foo',
        choices: [{ name: 'foo', value: 'foo' }],
        loop: true
      }])
      expect(stdinResponses.name).to.eql("Alice")
    })
  })
})
