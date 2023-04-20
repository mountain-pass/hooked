/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import { formatLocalISOString } from '../src/lib/history.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('history', () => {

  it('format local timezone', async () => {
    const ts = 1681967722453
    const tzoffsetMinutes = -600 // Australia/Sydney (AEDT)
    expect(formatLocalISOString(ts, tzoffsetMinutes)).to.eql('2023-04-20T15:15:22+10:00')
  })
})
