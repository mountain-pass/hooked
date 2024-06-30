/* eslint-disable no-template-curly-in-string */
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import { displaySuccessfulScript, formatLocalISOString } from '../src/lib/history.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('history', () => {

  it('formatLocalISOString()', async () => {
    const ts = 1681967722453
    const tzoffsetMinutes = -600 // Australia/Sydney (AEDT)
    expect(formatLocalISOString(ts, tzoffsetMinutes)).to.eql('2023-04-20T15:15:22+10:00')
  })

  it('displaySuccessfulScript()', async () => {
    const string = displaySuccessfulScript({
      ts: 1681967722453,
      envNames: ['default', 'foobar'],
      scriptPath: ['say', 'hello again'],
      stdin: {dog: 'yyy', cat: 'xxx'}
    }, true, -600) // Australia/Sydney (AEDT)
    expect(string).to.eql('2023-04-20T15:15:22+10:00: j say "hello again" --env default,foobar --stdin \'{"dog":"yyy","cat":"xxx"}\'')
  })
})
