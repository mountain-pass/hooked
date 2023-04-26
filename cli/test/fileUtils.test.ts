/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import os from 'os'
import path from 'path'
import { resolvePath } from '../src/lib/utils/fileUtils.js'
chai.use(chaiAsPromised)
const { expect } = chai


describe('fileUtils', () => {

  it('should resolve home directories', async () => {
    expect(resolvePath('~/hooked.yaml')).to.equal(path.join(os.homedir(), 'hooked.yaml'))
  })
})
