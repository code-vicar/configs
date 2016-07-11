var path = require('path')
var fs = require('fs')
var Promise = require('bluebird')
var expect = require('chai').expect
var sinon = require('sinon')
var rewire = require('rewire')
var del = require('del')
var _ = require('lodash')

var doesFileAlreadyExist = require('../utils').doesFileAlreadyExist

var fetch = rewire('../cmds/fetch')

var configsFolderPath = path.resolve(__dirname, './configs')

var readFile = Promise.promisify(fs.readFile)
var mkdirp = Promise.promisify(require('mkdirp'))

var mockS3 = {
    listBucketsAsync: Promise.method(function () {
        return {
            Buckets: [
                { Name: 'testBucket' },
                { Name: 'anotherTestBucket' },
                { Name: 'suchBucketness' }
            ]
        }
    }),
    getObjectAsync: function (req) {
        return Promise.try(function () {
            var known = [
                'configs/DEV/config1.json',
                'configs/QA/config1.json',
                'configs/DEV/config2.json',
                'test/configs/DEV/config1.json'
            ]
            if (_.includes(known, req.Key)) {
                return {
                    Body: 'you got it',
                    Key: req.Key
                }
            }
            throw new Error('Could not find file')
        })
    }
}

sinon.spy(mockS3, 'getObjectAsync')

fetch.__set__('s3', mockS3)

describe('fetch', function () {
    afterEach(function (done) {
        del(path.resolve(__dirname, 'config.json')).then(function () {
            done()
        }).catch(done)

        mockS3.getObjectAsync.reset()
    })

    it('should throw an error if cwd is invalid', function (done) {
        fetch({ cwd: 'blah', version: '1' }).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            expect(err.message).to.not.equal('Should not succeed')
            done()
        })
    })

    it('should throw an error if version is not specified', function (done) {
        fetch({ cwd: __dirname, bucket: 'suchBucketness' }).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            expect(err.message).to.equal('Must specify version (String)')
            done()
        })
    })

    it('should throw an error if env is not valid', function (done) {
        fetch({ env: 'ldkdalk', version: '1', cwd: __dirname, bucket: 'suchBucketness' }).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            expect(err.message).to.equal('Unknown \'env\' (ldkdalk) given')
            done()
        })
    })

    it('should throw an error if bucket is invalid', function (done) {
        fetch({ cwd: __dirname, version: '1' }).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            expect(err.message).to.equal('Invalid s3 bucket')
            done()
        })
    })

    it('should throw an error if bucket is not found', function (done) {
        fetch({ cwd: __dirname, version: '1', bucket: 'notinthelist' }).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            expect(err.message).to.equal('s3 bucket doesn\'t exist (notinthelist)')
            done()
        })
    })

    describe('requesting different versions', function () {
        it('should request the given version (1)', function (done) {
            fetch({ cwd: __dirname, version: '1', bucket: 'suchBucketness' }).then(function () {
                expect(mockS3.getObjectAsync.getCall(0)).to.exist
                expect(mockS3.getObjectAsync.getCall(0).args[0]).to.exist
                expect(mockS3.getObjectAsync.getCall(0).args[0].Key).to.match(/.*configs.*config1.json/)
                done()
            }).catch(done)
        })

        it('should request the given version (2)', function (done) {
            fetch({ cwd: __dirname, version: '2', bucket: 'suchBucketness' }).then(function () {
                expect(mockS3.getObjectAsync.getCall(0)).to.exist
                expect(mockS3.getObjectAsync.getCall(0).args[0]).to.exist
                expect(mockS3.getObjectAsync.getCall(0).args[0].Key).to.match(/.*configs.*config2.json/)
                done()
            }).catch(done)
        })
    })

    it('should use DEV as default env', function (done) {
        fetch({ cwd: __dirname, version: '1', bucket: 'suchBucketness' }).then(function () {
            expect(mockS3.getObjectAsync.called).to.be.true
            expect(mockS3.getObjectAsync.getCall(0)).to.exist
            expect(mockS3.getObjectAsync.getCall(0).args[0]).to.exist
            expect(mockS3.getObjectAsync.getCall(0).args[0].Key).to.match(/.*configs\/DEV\/config.*/)
            done()
        }).catch(done)
    })

    it('should set Bucket correctly', function (done) {
        fetch({ cwd: __dirname, version: '1', bucket: 'suchBucketness' }).then(function () {
            expect(mockS3.getObjectAsync.getCall(0)).to.exist
            expect(mockS3.getObjectAsync.getCall(0).args[0]).to.exist
            expect(mockS3.getObjectAsync.getCall(0).args[0].Bucket).to.equal('suchBucketness')
            done()
        }).catch(done)
    })

    it('should throw an error if config cannot be fetched', function (done) {
        fetch({ cwd: __dirname, version: '3', bucket: 'suchBucketness' }).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            expect(err.message).to.equal('Could not fetch config file \'configs/DEV/config3.json\' from bucket \'suchBucketness\'')
            done()
        }).catch(done)
    })

    it('should request correct config when given an env value', function (done) {
        fetch({ cwd: __dirname, env: 'QA', version: '1', bucket: 'suchBucketness' }).then(function () {
            expect(mockS3.getObjectAsync.getCall(0)).to.exist
            expect(mockS3.getObjectAsync.getCall(0).args[0]).to.exist
            expect(mockS3.getObjectAsync.getCall(0).args[0].Key).to.match(/.*configs\/QA\/config.*/)
            done()
        }).catch(done)
    })

    it('should call getObjectAsync with prefix', function (done) {
        fetch({ cwd: __dirname, prefix: 'test', version: '1', bucket: 'suchBucketness' }).then(function () {
            expect(mockS3.getObjectAsync.getCall(0)).to.exist
            expect(mockS3.getObjectAsync.getCall(0).args[0]).to.exist
            expect(mockS3.getObjectAsync.getCall(0).args[0].Key).to.match(/test\/configs\/*./)
            done()
        }).catch(done)
    })

    describe('created config.json file', function () {
        it('should have contents of requested config file', function (done) {
            fetch({ cwd: __dirname, version: '1', bucket: 'suchBucketness' }).then(function () {
                return readFile(path.resolve(__dirname, 'config.json'), 'utf8').then(function (contents) {
                    expect(contents).to.equal('you got it')
                })
            }).then(function () {
                done()
            }).catch(done)
        })

        describe('write locations', function () {
            beforeEach(function (done) {
                return mkdirp(path.resolve(__dirname, 'customdir')).then(function () {
                    done()
                }).catch(done)
            })

            afterEach(function (done) {
                return del(path.resolve(__dirname, 'customdir')).then(function () {
                    done()
                }).catch(done)
            })

            it('cwd as __dirname location', function (done) {
                fetch({ cwd: __dirname, version: '1', bucket: 'suchBucketness' }).then(function () {
                    return doesFileAlreadyExist(path.resolve(__dirname, 'config.json'))
                }).then(function (exists) {
                    expect(exists).to.be.true
                }).then(function () {
                    done()
                }).catch(done)
            })

            it('cwd as test location', function (done) {
                fetch({ cwd: path.resolve(__dirname, 'customdir'), version: '1', bucket: 'suchBucketness' }).then(function () {
                    return doesFileAlreadyExist(path.resolve(__dirname, 'customdir', 'config.json'))
                }).then(function (exists) {
                    expect(exists).to.be.true
                }).then(function () {
                    done()
                }).catch(done)
            })
        })
    })
})
