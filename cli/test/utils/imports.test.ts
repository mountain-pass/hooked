/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import { describe } from 'mocha'
import path from 'path'
import sinon from 'sinon'
import { LOCAL_CACHE_PATH } from '../../src/lib/defaults.js'
import fileUtils from '../../src/lib/utils/fileUtils.js'
import { fetchImports } from '../../src/lib/utils/imports.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('imports', () => {

    const local = LOCAL_CACHE_PATH

    beforeEach(() => {
        sinon.restore()
        if (fs.existsSync('doesnotexist.yaml')) fs.unlinkSync('doesnotexist.yaml')
    })

    afterEach(() => {
        sinon.restore()
        if (fs.existsSync('doesnotexist.yaml')) fs.unlinkSync('doesnotexist.yaml')
    })

    // remote files

    describe('remote imports', () => {

        it('required - exists', async () => {
            sinon.stub(fileUtils, 'downloadFile').resolves()
            await expect(fetchImports(['https://fakedomain.com/doesexist.yaml'], false)).to.eventually.eql([path.join(LOCAL_CACHE_PATH, 'doesexist.yaml')])
        })
    
        it('required - not exists', async () => {
            sinon.stub(fileUtils, 'downloadFile').rejects(new Error('404 File missing'))
            await expect(fetchImports(['https://fakedomain.com/doesnotexist.yaml'], false)).to.eventually.be.rejectedWith('404 File missing')
        })

        it('optional - exists', async () => {
            sinon.stub(fileUtils, 'downloadFile').resolves()
            await expect(fetchImports(['https://fakedomain.com/doesexist.yaml?'], false)).to.eventually.eql([path.join(LOCAL_CACHE_PATH, 'doesexist.yaml')])
        })
    
        it('optional - not exists', async () => {
            sinon.stub(fileUtils, 'downloadFile').rejects(new Error('404 File missing'))
            await expect(fetchImports(['https://fakedomain.com/doesnotexist.yaml?'], false)).to.eventually.eql([])
        })

        // TODO test where file already cached
        // TODO test where file already cached and pull = true

    })

    // local files

    describe('local imports', () => {

        it('required - exists', async () => {
            fs.writeFileSync('doesexist.yaml', 'hello')
            await expect(fetchImports(['doesexist.yaml'], false)).to.eventually.eql(['doesexist.yaml'])
        })
    
        it('required - not exists', async () => {
            await expect(fetchImports(['doesnotexist.yaml'], false)).to.eventually.be.rejectedWith('Missing import files: doesnotexist.yaml')
            await expect(fetchImports(['doesnotexist.yaml', 'doesnotexist2.yaml'], false)).to.eventually.be.rejectedWith('Missing import files: doesnotexist.yaml, doesnotexist2.yaml')
        })
    
        it('optional - exists', async () => {
            fs.writeFileSync('doesexist.yaml', 'hello')
            await expect(fetchImports(['doesexist.yaml?'], false)).to.eventually.eql(['doesexist.yaml'])
        })
    
        it('optional - not exists', async () => {
            await expect(fetchImports(['doesnotexist.yaml?'], false)).to.eventually.eql([])
            await expect(fetchImports(['doesnotexist.yaml?', 'doesnotexist2.yaml?'], false)).to.eventually.eql([])
        })
    
        it('mix of local imports', async () => {
            fs.writeFileSync('doesexist.yaml', 'hello')
            // required and optional
            await expect(fetchImports(['doesexist.yaml', 'doesnotexistoptional.yaml?'], false)).to.eventually.eql(['doesexist.yaml'])
            // required and missing
            await expect(fetchImports(['doesexist.yaml', 'doesnotexist.yaml'], false)).to.eventually.be.rejectedWith('Missing import files: doesnotexist.yaml')
        })

    })

})
