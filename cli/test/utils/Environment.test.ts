/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import fs from 'fs'
import { describe } from 'mocha'
import sinon from 'sinon'
import { LOCAL_CACHE_PATH } from '../../src/lib/defaults.js'
import { Environment } from '../../src/lib/utils/Environment.js'
chai.use(chaiAsPromised)
const { expect } = chai

describe('Environment', () => {

    let env = new Environment()

    beforeEach(() => {
        env = new Environment()
        sinon.restore()
    })

    afterEach(() => {
        sinon.restore()
    })

    // crud - put

    describe('putX', () => {
        it('simple put global', async () => {
            env.putGlobal('aaa', '111')
            expect(env.getAll()).to.eql({ aaa: '111' })
        })
    
        it('simple put resolve', async () => {
            env.putResolved('aaa', '111')
            expect(env.getAll()).to.eql({ aaa: '111' })
        })
    
        it('simple put secrets, should not be exposed', async () => {
            env.putSecret('aaa', '111')
            expect(env.getAll()).to.eql({})
            expect(env.hasSecret('aaa')).to.eql(true)
        })

        describe('convention: secret in the name, should be treated as a secret', () => {
            it('simple put global', async () => {
                env.putGlobal('aaa_seCREt_x', '111')
                expect(env.getAll()).to.eql({})
                expect(env.hasSecret('aaa_seCREt_x')).to.eql(true)
            })
        
            it('simple put resolve', async () => {
                env.putResolved('aaa_seCREt_x', '111')
                expect(env.getAll()).to.eql({})
                expect(env.hasSecret('aaa_seCREt_x')).to.eql(true)
            })
        })
    })


    describe('putAllX', () => {
        it('simple put MANY global', async () => {
            env.putAllGlobal({'aaa': '111', 'bbb': '222'})
            expect(env.getAll()).to.eql({ aaa: '111', bbb: '222' })
        })

        it('simple put MANY resolve', async () => {
            env.putAllResolved({'aaa': '111', 'bbb': '222'})
            expect(env.getAll()).to.eql({ aaa: '111', bbb: '222' })
        })

        it('simple put MANY secrets, should not be exposed', async () => {
            env.putAllSecrets({'aaa': '111', 'bbb': '222'})
            expect(env.getAll()).to.eql({})
        })


        describe('convention: secret in the name, should be treated as a secret', () => {
            it('simple put global', async () => {
                env.putAllGlobal({'aaa': '111', 'aaa_seCREt_x': '222'})
                expect(env.getAll()).to.eql({ aaa: '111' })
                expect(env.hasSecret('aaa_seCREt_x')).to.eql(true)
            })
        
            it('simple put resolve', async () => {
                env.putAllResolved({'aaa': '111', 'aaa_seCREt_x': '222'})
                expect(env.getAll()).to.eql({ aaa: '111' })
                expect(env.hasSecret('aaa_seCREt_x')).to.eql(true)
            })
        })
    })

    describe('toXXX', () => {
        it('to docker env file - should ignore globals and secrets', async () => {
            env.putAllGlobal({'aaa': '111', 'bbb': '222'})
            env.putAllResolved({'ccc': '333', 'ddd': '444'})
            env.putAllSecrets({'eee': '555', 'fff': '666'})
            expect(env.envToDockerEnvfile()).to.eql(`ccc=333\nddd=444\n`)
        })

        it('to shell - should ignore globals and secrets', async () => {
            env.putAllGlobal({'aaa': '111', 'bbb': '222'})
            env.putAllResolved({'ccc': '333', 'ddd': '444'})
            env.putAllSecrets({'eee': '555', 'fff': '666'})
            expect(env.envToShellExports()).to.eql(`\nexport ccc="333"\nexport ddd="444"\n\n`)
        })

        it ('to shell - should escape double quotes', async () => {
            env.putAllResolved({'ccc': 'echo "Hello"'})
            expect(env.envToShellExports()).to.eql(`\nexport ccc="echo \\"Hello\\""\n\n`)

        })
    })
    
    it('isSecret', () => {
        expect(env.isSecret('aaa')).to.eql(false)
        expect(env.isSecret('secret')).to.eql(true)
        expect(env.isSecret('aaa_secret')).to.eql(true)
        expect(env.isSecret('secret_aaa')).to.eql(true)
        expect(env.isSecret('aaa_secret_aaa')).to.eql(true)
        expect(env.isSecret('aaa_SECRET_aaa')).to.eql(true)
    })
    
    it('purgeSecrets', () => {
        env.putSecret('aaa', '111')
        expect(env.hasSecret('aaa')).to.eql(true)
        env.purgeSecrets()
        expect(env.hasSecret('aaa')).to.eql(false)
    })

    it('willNotBeResolved', () => {
        env.setDoNotResolve(['aaa'])
        expect(env.willNotBeResolved('aaa')).to.eql(true)
        expect(env.willNotBeResolved('bbb')).to.eql(false)
        // TODO test with resolution?
    })

    it('getMissingRequiredKeys', () => {
        expect(env.getMissingRequiredKeys('this ${MISSING1} $IGNORED1 ${MISSING2}'))
            .to.eql(['MISSING1', 'MISSING2'])
        // add a resolved key, then the variable should no longer be missing
        env.putResolved('MISSING1', '111')
        expect(env.getMissingRequiredKeys('this ${MISSING1} $IGNORED1 ${MISSING2}'))
            .to.eql(['MISSING2'])
    })

    describe('resolve', () => {
        
        it('should error if missing all variables', async () => {
            expect(() => env.resolve('this ${MISSING1} $IGNORED1 ${MISSING2}'))
                .to.throw(`Environment 'NOT_DEFINED' is missing required environment variables: ["MISSING1","MISSING2"]. Found []`)
        })

        it('should error if missing some variables', async () => {
            env.putResolved('MISSING1', '111')
            env.putResolved('FOO', 'bar')
            expect(() => env.resolve('this ${MISSING1} $IGNORED1 ${MISSING2}'))
                .to.throw(`Environment 'NOT_DEFINED' is missing required environment variables: ["MISSING2"]. Found ["MISSING1","FOO"]`)
        })

        it('should resolve all variables', async () => {
            env.putGlobal('MISSING1', '111')
            env.putResolved('MISSING2', '222')
            env.putSecret('MISSING3', '333')
            expect(env.resolve('this $IGNORED1 ${MISSING1} ${MISSING2} ${MISSING3}', 'SOMEKEY'))
                .to.eql(`this $IGNORED1 111 222 333`)
        })

        it('should NOT resolve variables with a key in the ignore list', async () => {
            // same as previous, except SOMEKEY is ignored...
            env.setDoNotResolve(['SOMEKEY'])
            env.putGlobal('MISSING1', '111')
            env.putResolved('MISSING2', '222')
            env.putSecret('MISSING3', '333')
            expect(env.resolve('this $IGNORED1 ${MISSING1} ${MISSING2} ${MISSING3}', 'SOMEKEY'))
                .to.eql('this $IGNORED1 ${MISSING1} ${MISSING2} ${MISSING3}')
        })

        // NOTE to lazy load values, they'll need to be resolved on demand (i.e. from script objects)
        // Alternatively, sort the scripts based on order of dependencies, then resolve in that order.

    })
})
