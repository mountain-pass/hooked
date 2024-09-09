import { After, Before, DataTable, Given, Then, When, World } from '@cucumber/cucumber';
import { expect } from 'chai';
import fs from 'fs/promises';
import sinon, { SinonSpy } from 'sinon';
import exitHandler from '../../src/lib/exitHandler.js';
import { newProgram } from '../../src/lib/program.js';
import verifyLocalRequiredTools from '../../src/lib/scriptExecutors/verifyLocalRequiredTools.js';
import logger from '../../src/lib/utils/logger.js';
import { fail } from 'assert';
import { Command } from 'commander';
import { CaptureWritableStream } from '../../src/lib/common/CaptureWritableStream.js';
import { fetchLastCall } from '../../test/utils/SinonUtils.js';

// let cleanupFiles: string[] = []

// AfterAll(async () => {
//     await Promise.all(cleanupFiles.map(fs.unlink))
// })

// const SYSTEM_ENVIRONMENT_VARIABLES = {
//     HOSTVAR: 'HOST_VAR_RESOLVED',
//     OTHER_HOST_VAR: 'SHOULD_NOT_BE_PASSED'
// }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type WorldType = {
    spyLoggerInfo: SinonSpy
    spyCaptureWritableStreamWhenUpdated: SinonSpy
    spyCaptureWritableStreamWhenFinished: SinonSpy
    result: any
    systemEnvironmentVariables: Record<string, string>
    shutdownServerController: AbortController
    currentJwt: string
    program: Command
}

Before(function (this: WorldType) {
    sinon.restore()
    sinon.stub(exitHandler, 'onExit').returns()
    sinon.stub(verifyLocalRequiredTools, 'verifyLatestVersion').resolves()
    this.spyLoggerInfo = sinon.spy(logger, 'info')
    this.spyCaptureWritableStreamWhenUpdated = sinon.spy(CaptureWritableStream.prototype, 'whenUpdated')
    this.spyCaptureWritableStreamWhenFinished = sinon.spy(CaptureWritableStream.prototype, 'whenFinished')
    this.systemEnvironmentVariables = {}
    this.shutdownServerController = new AbortController()
})

After(function (this: WorldType) {
    this.shutdownServerController.abort("shutdown requested by steps.ts")
})

Given('the environment variables', function (this: WorldType, dataTable: DataTable) {
    // Write code here that turns the phrase above into concrete actions
    this.systemEnvironmentVariables = dataTable.raw().reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
    }, {} as Record<string, string>)
});

Given('the file {word} is', async function (this: WorldType, filename: string, docString: string) {
    await fs.writeFile(filename, docString, { encoding: 'utf-8' })
});

When('I run the command {string}', async function (this: WorldType, command: string) {
    this.program = newProgram(this.systemEnvironmentVariables, this.shutdownServerController.signal)
    this.result = await this.program.parseAsync(command.split(' '))
});

// NOT POSSIBLE - if synchronous (i.e. !server, then even if async, the command will block the app)
When('I run the command {string} non-blocking', async function (command: string) {
    this.program = newProgram(this.systemEnvironmentVariables, this.shutdownServerController.signal)
    this.program.parseAsync(command.split(' ')).then((res: string) => { this.result = res })
});

When('I wait until the server is ready', async function (this: WorldType) {
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

Then('I can login with username {word} and password {word}', async function (this: WorldType, username: string, password: string) {
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
    this.currentJwt = jwt!
})

Then('the endpoint {word} should respond {int} with body {string}', verifyBodyEndpoint)
Then('the endpoint {word} should respond {int} with body', verifyBodyEndpoint)
Then('the endpoint {word} should respond {int} with body containing {string}', verifyBodyContainingEndpoint)
Then('the endpoint {word} should respond {int} with body containing', verifyBodyContainingEndpoint)
Then('the endpoint {word} should respond {int} with json {string}', verifyJsonEndpoint)
Then('the endpoint {word} should respond {int} with json', verifyJsonEndpoint)

async function verifyJsonEndpoint(
    this: WorldType,
    apiEndpoint: string,
    expectedStatus: number,
    expectedResponse: string
): Promise<void> {
    await verifyEndpoint.call(this, apiEndpoint, expectedStatus, expectedResponse, true, false)
}
async function verifyBodyEndpoint(
    this: WorldType,
    apiEndpoint: string,
    expectedStatus: number,
    expectedResponse: string
): Promise<void> {
    await verifyEndpoint.call(this, apiEndpoint, expectedStatus, expectedResponse, false, false)
}
async function verifyBodyContainingEndpoint(
    this: WorldType,
    apiEndpoint: string,
    expectedStatus: number,
    expectedResponse: string
): Promise<void> {
    await verifyEndpoint.call(this, apiEndpoint, expectedStatus, expectedResponse, false, true)
}

// (this: WorldType, ...args: any[]) => any
async function verifyEndpoint(
    this: WorldType,
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

Then('the endpoints should all respond within {int} to {int} seconds', async function (this: WorldType, fromTimeSecs: number, toTimeSecs: number, dataTable: DataTable) {
    const toleranceMs = 950
    const start = performance.now()
    const promises = dataTable.raw().map(async ([apiEndpoint]) => {
        return await fetch(`http://localhost:4000${apiEndpoint}`, { method: 'GET', headers: { 'Cookie': this.currentJwt } })
    })
    const results = await Promise.all(promises)
    const totalDuration = performance.now() - start
    expect(totalDuration, `duration was not gt ${fromTimeSecs} seconds`).to.be.greaterThan(fromTimeSecs * 1000 - toleranceMs)
    expect(totalDuration, `duration was not lt ${toTimeSecs} seconds`).to.be.lessThan(toTimeSecs * 1000 + toleranceMs)
    for (const result of results) {
        expect(result.status).to.eql(200)
    }

});

// When('I shutdown the server', function () {
//     this.shutdownServerController.abort("shutdown requested by steps.ts")
// })

Then('the logger.info should be', verifySpyLoggerOutputMatches);
Then('the logger.info should contain', verifySpyLoggerOutputContains);
Then('the logger.info should be {string}', verifySpyLoggerOutputMatches);
Then('the logger.info should contain {string}', verifySpyLoggerOutputContains);

Then('the command output should be', verifySpyCommandOutputMatches);
Then('the command output should contain', verifySpyCommandOutputContains);
Then('the command output should be {string}', verifySpyCommandOutputMatches);
Then('the command output should contain {string}', verifySpyCommandOutputContains);

// mappers

function verifySpyLoggerOutputContains(this: WorldType, expectedOutput: string) {
    return verifySpyOutput.call(this, this.spyLoggerInfo, expectedOutput, true)
}

function verifySpyLoggerOutputMatches(this: WorldType, expectedOutput: string) {
    return verifySpyOutput.call(this, this.spyLoggerInfo, expectedOutput, false)
}
function verifySpyCommandOutputContains(this: WorldType, expectedOutput: string) {
    return verifySpyOutput.call(this, this.spyCaptureWritableStreamWhenUpdated, expectedOutput, true)
}

function verifySpyCommandOutputMatches(this: WorldType, expectedOutput: string) {
    return verifySpyOutput.call(this, this.spyCaptureWritableStreamWhenUpdated, expectedOutput, false)
}

// verify

function verifySpyOutput(this: WorldType, spy: SinonSpy, expectedOutput: string, containingString: boolean) {
    const calls = fetchLastCall(spy);
    if (containingString) {
        expect(calls.last, `last output did not contain (all):\n${calls.all.join('\n')}`).to.contain(expectedOutput.trim())
    } else {
        expect(calls.last, `last output did not match (all):\n${calls.all.join('\n')}`).to.eql(expectedOutput.trim())
    }
}

Then('the user enters {string}', function (this: WorldType, output: string) {
    process.stdin.emit('data', output + "\n")
});

Then('the endpoints should respond', async function (this: WorldType, dataTable: DataTable) {
    expect(this.currentJwt).to.not.be.undefined
    expect(this.currentJwt).to.not.be.null
    for (const [apiEndpoint, expectedStatus, expectedBody] of dataTable.raw()) {
        const result = await fetch(`http://localhost:4000${apiEndpoint}`, { method: 'GET', headers: { 'Cookie': this.currentJwt } })
        expect(result.status, `${apiEndpoint} - status did not match ${expectedStatus}`).to.eql(parseInt(expectedStatus))
        expect(await result.text(), `${apiEndpoint} - body did not match expected`).to.eql(expectedBody)
    }
});

Then('the user waits {int} milliseconds', async function (this: WorldType, milliseconds: number) {
    await sleep(milliseconds)
})

// Then('the logged output should be', async function(expectedOutput: string) {
//     const expectedLines = expectedOutput.split('\n');
//     for (let i = 0; i < expectedLines.length; i++) {
//         expect(this.spylog.getCall(i).args[0], `expected logged output line ${i} to match`).to.eql(expectedOutput)
//     }
// })