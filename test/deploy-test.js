var path = require('path')
var Promise = require('bluebird')
var expect = require('chai').expect
var sinon = require('sinon')
var rewire = require('rewire')
var del = require('del')
var _ = require('lodash')

var newversion = require('../cmds/newversion')
var deploy = rewire('../cmds/deploy')

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
    putObjectAsync: Promise.method(function () {
        return 'ok'
    })
}

sinon.spy(mockS3, 'putObjectAsync')

deploy.__set__('s3', mockS3)

describe('deploy', function () {
    beforeEach(function(done) {
        newversion({cwd: __dirname}).then(function(){
            done()
        }).catch(done)
    })

    afterEach(function(done){
        del(path.resolve(__dirname, 'configs')).then(function() {
            done()
        }).catch(done)
    })

    it('should throw error if cwd is invalid', function (done) {
        deploy({ cwd: 'blah' }).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            done()
        })
    })

    it('throw error if bucket is invalid', function (done) {
        deploy({cwd: __dirname}).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            expect(err.message).to.equal('Invalid s3 bucket')
            done()
        })
    })

    it('throw error if bucket is not found', function (done) {
        deploy({cwd: __dirname, bucket: 'notinthelist' }).then(function () {
            done(new Error('Should not succeed'))
        }).catch(function (err) {
            expect(err).to.exist
            expect(err.message).to.equal('s3 bucket doesn\'t exist (notinthelist)')
            done()
        })
    })

    describe('uploadFiles', function () {
        beforeEach(function () {
            mockS3.putObjectAsync.reset()
        })
        describe('without prefix', function () {
            it('should call putObjectAsync once for each file', function (done) {
                deploy({cwd: __dirname, bucket: 'testBucket' }).then(function () {
                    expect(mockS3.putObjectAsync.callCount).to.equal(5)
                    done()
                }).catch(done)
            })
            it('should call putObjectAsync with correct values', function (done) {
                deploy({cwd: __dirname, bucket: 'testBucket' }).then(function () {
                    var allCallArgs = mockS3.putObjectAsync.getCalls().map(function (spyCall) {
                        return spyCall.args
                    })

                    var files = [
                        'configs/DEV/config1.json',
                        'configs/QA/config1.json',
                        'configs/STAGING/config1.json',
                        'configs/LIVE/config1.json',
                        'configs/versions.json'
                    ]

                    _.forEach(files, function (file) {
                        var callArgs = _.find(allCallArgs, function (callArgs) {
                            return callArgs[0].Key === file
                        })

                        expect(callArgs).to.exist
                        expect(callArgs[0]).to.exist
                        expect(callArgs[0].Bucket).to.equal('testBucket')
                        expect(callArgs[0].ACL).to.equal('private')
                    })
                }).then(done).catch(done)
            })
        })

        describe('with prefix', function () {
            it('should call putObjectAsync once for each file', function (done) {
                deploy({cwd: __dirname, bucket: 'anotherTestBucket', prefix: 'xyz' }).then(function () {
                    expect(mockS3.putObjectAsync.callCount).to.equal(5)
                    done()
                }).catch(done)
            })

            it('should call putObjectAsync with correct values', function (done) {
                deploy({cwd: __dirname, bucket: 'testBucket', prefix: 'prefix' }).then(function () {
                    var allCallArgs = mockS3.putObjectAsync.getCalls().map(function (spyCall) {
                        return spyCall.args
                    })

                    var files = [
                        'prefix/configs/DEV/config1.json',
                        'prefix/configs/QA/config1.json',
                        'prefix/configs/STAGING/config1.json',
                        'prefix/configs/LIVE/config1.json',
                        'prefix/configs/versions.json'
                    ]

                    _.forEach(files, function (file) {
                        var callArgs = _.find(allCallArgs, function (callArgs) {
                            return callArgs[0].Key === file
                        })

                        expect(callArgs).to.exist
                        expect(callArgs[0]).to.exist
                        expect(callArgs[0].Bucket).to.equal('testBucket')
                        expect(callArgs[0].ACL).to.equal('private')
                    })
                }).then(done).catch(done)
            })
        })
    })
})
