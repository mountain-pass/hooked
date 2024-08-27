import { After, Before, DataTable, Given, Then, When, World } from '@cucumber/cucumber';
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

// NOT POSSIBLE - if synchronous (i.e. !server, then even if async, the command will block the app)
// When('I run the command {string} non-blocking', async function (command: string) {
//     this.program = newProgram(this.systemEnvironmentVariables, this.shutdownServerController.signal)
//     this.program.parseAsync(command.split(' ')).then((res: string) => { this.result = res })
// });

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

Then('the endpoint {word} should respond {int} with body {string}', verifyBodyEndpoint)
Then('the endpoint {word} should respond {int} with body', verifyBodyEndpoint)
Then('the endpoint {word} should respond {int} with body containing {string}', verifyBodyContainingEndpoint)
Then('the endpoint {word} should respond {int} with body containing', verifyBodyContainingEndpoint)
Then('the endpoint {word} should respond {int} with json {string}', verifyJsonEndpoint)
Then('the endpoint {word} should respond {int} with json', verifyJsonEndpoint)

async function verifyJsonEndpoint(
    this: any,
    apiEndpoint: string, 
    expectedStatus: number, 
    expectedResponse: string
): Promise<void> {
    await verifyEndpoint.call(this, apiEndpoint, expectedStatus, expectedResponse, true, false)
}
async function verifyBodyEndpoint(
    this: any,
    apiEndpoint: string, 
    expectedStatus: number, 
    expectedResponse: string
): Promise<void> {
    await verifyEndpoint.call(this, apiEndpoint, expectedStatus, expectedResponse, false, false)
}
async function verifyBodyContainingEndpoint(
    this: any,
    apiEndpoint: string, 
    expectedStatus: number, 
    expectedResponse: string
): Promise<void> {
    await verifyEndpoint.call(this, apiEndpoint, expectedStatus, expectedResponse, false, true)
}

// (this: WorldType, ...args: any[]) => any
async function verifyEndpoint(
    this: any,
    apiEndpoint: string, 
    expectedStatus: number, 
    expectedResponse: string,
    asJson: boolean,
    containingString: boolean
): Promise<void> {
    const result = await fetch(`http://localhost:4000${apiEndpoint}`, { method: 'GET', headers: { 'Cookie': this.currentJwt } })
    expect(result.status, `${apiEndpoint} - status did not match ${expectedStatus}`).to.eql(expectedStatus)
    if (expectedResponse !== '') {
        let actual = await result.text();
        actual = actual.replace(/"finishedAt":\d{13}/g, '"finishedAt":<TIMESTAMP_MS>')
        if (asJson) {
            expect(JSON.parse(actual), `${apiEndpoint} - body did not match`).to.eql(JSON.parse(expectedResponse))
        } else {
            if (containingString) {
                expect(actual, `${apiEndpoint} - body did not contain ${expectedResponse}`).to.contain(expectedResponse)
            } else {
                expect(actual, `${apiEndpoint} - body did not match`).to.eql(expectedResponse)
            }
        }
    }
}

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

// Then('the user waits {int} milliseconds', async function (milliseconds: number) {
//     await sleep(milliseconds)
// })

// Then('the logged output should be', async function(expectedOutput: string) {
//     const expectedLines = expectedOutput.split('\n');
//     for (let i = 0; i < expectedLines.length; i++) {
//         expect(this.spylog.getCall(i).args[0], `expected logged output line ${i} to match`).to.eql(expectedOutput)
//     }
// })