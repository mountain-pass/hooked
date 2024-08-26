import { After, Before, DataTable, Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'chai';
import fs from 'fs/promises';
import sinon from 'sinon';
import exitHandler from '../../src/lib/exitHandler.js';
import { newProgram } from '../../src/lib/program.js';
import verifyLocalRequiredTools from '../../src/lib/scriptExecutors/verifyLocalRequiredTools.js';
import logger from '../../src/lib/utils/logger.js';
import { fail } from 'assert';

// let cleanupFiles: string[] = []

// AfterAll(async () => {
//     await Promise.all(cleanupFiles.map(fs.unlink))
// })

// const SYSTEM_ENVIRONMENT_VARIABLES = {
//     HOSTVAR: 'HOST_VAR_RESOLVED',
//     OTHER_HOST_VAR: 'SHOULD_NOT_BE_PASSED'
// }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

Before(function () {
    sinon.restore()
    sinon.stub(exitHandler, 'onExit').returns()
    sinon.stub(verifyLocalRequiredTools, 'verifyLatestVersion').resolves()
    this.spylog = sinon.spy(logger, 'info')
    this.systemEnvironmentVariables = {}
    this.shutdownServerController = new AbortController()
})

After(function () {
    this.shutdownServerController.abort("shutdown requested by steps.ts")
})

Given('the environment variables', function (dataTable: DataTable) {
    // Write code here that turns the phrase above into concrete actions
    this.systemEnvironmentVariables = dataTable.raw().reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
    }, {} as Record<string, string>)
});

Given('the file {word} is', async function (filename: string, docString: string) {
    await fs.writeFile(filename, docString, { encoding: 'utf-8' })
});

When('I run the command {string}', async function (command: string) {
    this.program = newProgram(this.systemEnvironmentVariables, this.shutdownServerController.signal)
    this.result = await this.program.parseAsync(command.split(' '))
});

When('I run the command {string} async', async function (command: string) {
    this.program = newProgram(this.systemEnvironmentVariables, this.shutdownServerController.signal)
    this.result = this.program.parseAsync(command.split(' '))
});

When('I wait until the server is ready', async function () {
    for (let i = 0; i < 10; i++) {
        try {
            const result = await fetch('http://localhost:4000/api/status')
            if (result.status === 200) {
                // console.log('result', result.status)
                // console.log('body', await result.json())
                return
            }
        } catch (e) {
            await sleep(1000)
        }
    }
    fail('Server did not start in time')
});

Then('I can login with username {word} and password {word}', async function (username: string, password: string) {
    const result = await fetch('http://localhost:4000/auth/login', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    expect(result.status).to.eql(200)
    const jwt = result.headers.get('set-cookie');
    expect(jwt).to.not.be.null
    this.currentJwt = jwt
})

Then('the endpoint {word} should respond {int} with body {string}', async function (
    apiEndpoint: string, 
    expectedStatus: number, 
    expectedResponse: string
) {
    const result = await fetch(`http://localhost:4000${apiEndpoint}`, { method: 'GET', headers: { 'Cookie': this.currentJwt } })
    expect(result.status, `${apiEndpoint} - status did not match ${expectedStatus}`).to.eql(expectedStatus)
    if (expectedResponse !== '') {
        let actual = await result.text();
        actual = actual.replace(/"finishedAt":\d{13}/g, '"finishedAt":<TIMESTAMP_MS>')
        expect(actual, `${apiEndpoint} - body did not match`).to.eql(expectedResponse)
    }
});


Then('the endpoints should all respond within {int} seconds', async function (expectedTimeSecs: number, dataTable: DataTable) {
    const start = performance.now()
    const promises = dataTable.raw().map(async ([apiEndpoint]) => {
        return await fetch(`http://localhost:4000${apiEndpoint}`, { method: 'GET', headers: { 'Cookie': this.currentJwt } })
    })
    const results = await Promise.all(promises)
    const totalDuration = performance.now() - start
    expect(totalDuration, `duration was not gt ${expectedTimeSecs} seconds`).to.be.greaterThan(expectedTimeSecs * 1000 - 500)
    expect(totalDuration, `duration was not lt ${expectedTimeSecs} seconds`).to.be.lessThan(expectedTimeSecs * 1000 + 500)
    for (const result of results) {
        expect(result.status).to.eql(200)
    }

});

// When('I shutdown the server', function () {
//     this.shutdownServerController.abort("shutdown requested by steps.ts")
// })

Then('the output should be', function (output: string) {
    sinon.assert.calledOnce(this.spylog)
    var actual = this.spylog.getCall(0).args[0]
    expect(actual.trim()).to.eql(output.trim())
});


Then('the endpoints should respond', async function (dataTable: DataTable) {
    expect(this.currentJwt).to.not.be.undefined
    expect(this.currentJwt).to.not.be.null
    for (const [apiEndpoint, expectedStatus, expectedBody] of dataTable.raw()) {
        const result = await fetch(`http://localhost:4000${apiEndpoint}`, { method: 'GET', headers: { 'Cookie': this.currentJwt } })
        expect(result.status, `${apiEndpoint} - status did not match ${expectedStatus}`).to.eql(parseInt(expectedStatus))
        expect(await result.text(), `${apiEndpoint} - body did not match expected`).to.eql(expectedBody)
    }
  });