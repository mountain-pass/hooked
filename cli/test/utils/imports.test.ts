/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import { describe } from 'mocha'
import path from 'path'
import sinon from 'sinon'
import defaults from '../../src/lib/defaults.js'
import fileUtils from '../../src/lib/utils/fileUtils.js'
import { fetchImports } from '../../src/lib/utils/imports.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('imports', () => {

    const local = defaults.getDefaults().LOCAL_CACHE_PATH

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
            await expect(fetchImports(['https://fakedomain.com/doesexist.yaml'], false)).to.eventually.eql([path.join(defaults.getDefaults().LOCAL_CACHE_PATH, 'doesexist.yaml')])
        })
    
        it('required - not exists', async () => {
            sinon.stub(fileUtils, 'downloadFile').rejects(new Error('404 File missing'))
            await expect(fetchImports(['https://fakedomain.com/doesnotexist.yaml'], false)).to.eventually.be.rejectedWith('404 File missing')
        })

        it('optional - exists', async () => {
            sinon.stub(fileUtils, 'downloadFile').resolves()
            await expect(fetchImports(['https://fakedomain.com/doesexist.yaml?'], false)).to.eventually.eql([path.join(defaults.getDefaults().LOCAL_CACHE_PATH, 'doesexist.yaml')])
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
            const filepath = path.resolve('doesexist.yaml')
            fs.writeFileSync(filepath, 'hello')
            await expect(fetchImports(['doesexist.yaml'], false)).to.eventually.eql([filepath])
        })
    
        it('required - not exists', async () => {
            const filepath = path.resolve('doesnotexist.yaml')
            const filepath2 = path.resolve('doesnotexist2.yaml')
            await expect(fetchImports(['doesnotexist.yaml'], false)).to.eventually.be.rejectedWith(`Missing import files: ${filepath}`)
            await expect(fetchImports(['doesnotexist.yaml', 'doesnotexist2.yaml'], false)).to.eventually.be.rejectedWith(`Missing import files: ${filepath}, ${filepath2}`)
        })
    
        it('optional - exists', async () => {
            const filepath = path.resolve('doesexist.yaml')
            fs.writeFileSync('doesexist.yaml', 'hello')
            await expect(fetchImports(['doesexist.yaml?'], false)).to.eventually.eql([filepath])
        })
    
        it('optional - not exists', async () => {
            await expect(fetchImports(['doesnotexist.yaml?'], false)).to.eventually.eql([])
            await expect(fetchImports(['doesnotexist.yaml?', 'doesnotexist2.yaml?'], false)).to.eventually.eql([])
        })
    
        it('mix of local imports', async () => {
            const filepath = path.resolve('doesexist.yaml')
            const filepath2 = path.resolve('doesnotexist.yaml')
            fs.writeFileSync(filepath, 'hello')
            // required and optional
            await expect(fetchImports(['doesexist.yaml', 'doesnotexistoptional.yaml?'], false)).to.eventually.eql([filepath])
            // required and missing
            await expect(fetchImports(['doesexist.yaml', 'doesnotexist.yaml'], false)).to.eventually.be.rejectedWith(`Missing import files: ${filepath2}`)
        })

    })

})
