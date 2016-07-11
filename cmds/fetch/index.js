var path = require('path')
var fs = require('fs')

var Promise = require('bluebird')
var _ = require('lodash')

var AWS = require('aws-sdk')
AWS.config.region = 'us-west-2'
// AWS.config.logger = process.stdout

var validateDirectory = require('../../utils').validateDirectory
var s3 = Promise.promisifyAll(new AWS.S3())
var writeFile = Promise.promisify(fs.writeFile)

module.exports = function (options) {
    var cwd = _.get(options, 'cwd')
    var bucket = _.get(options, 'bucket')
    var version = _.get(options, 'version')
    var prefix = _.get(options, 'prefix') || ''
    var env = _.get(options, 'env')

    return validateDirectory(cwd).then(function (_cwd) {
        cwd = _cwd
        return validateBucket(bucket)
    }).then(function () {
        return validateVersion(version)
    }).then(function () {
        return validateEnv(env)
    }).then(function (_env) {
        env = _env
        return fetch(cwd, bucket, prefix, version, env)
    }).then(function(files) {
        return { cwd: cwd, bucket: bucket, version: version, prefix: prefix, env: env, files: files }
    })
}

function validateBucket(bucket) {
    if (!_.isString(bucket) || bucket.length === 0) {
        throw new Error('Invalid s3 bucket')
    }
    return s3.listBucketsAsync().then(function (response) {
        var bucketList = _.map(response.Buckets, function (b) {
            return b.Name
        })

        if (!_.includes(bucketList, bucket)) {
            throw new Error('s3 bucket doesn\'t exist (' + bucket + ')')
        }
    })
}

function validateVersion(version) {
    if (!_.isString(version) || version.length === 0) {
        throw new Error('Must specify version (String)')
    }
}

function validateEnv(env) {
    if (_.isNil(env)) {
        env = 'DEV'
    }

    var envs = [
        'DEV',
        'QA',
        'STAGING',
        'LIVE'
    ]

    if (!_.includes(envs, env)) {
        throw new Error('Unknown \'env\' (' + env + ') given')
    }

    return env
}

function fetch(cwd, bucket, prefix, version, env) {
    var key = 'configs/' + env + '/config' + version + '.json'
    key = path.join(prefix, key)

    return s3.getObjectAsync({
        Bucket: bucket,
        Key: key
    }).then(function (s3Resp) {
        return Promise.try(function () {
            var body = _.get(s3Resp, 'Body')
            if (_.isNil(body)) {
                throw new Error('Invalid content body in response')
            }
            return writeFile(path.resolve(cwd, 'config.json'), body)
        }).then(function() {
            return [
                key + ' -> ' + path.join(cwd, 'config.json')
            ]
        }).catch(function (err) {
            var newErr = new Error('Write file error')
            newErr.innerError = err
            throw newErr
        })
    }).catch(function (err) {
        if (err && err.message === 'Write file error') {
            throw err.innerError
        }

        throw new Error('Could not fetch config file \'' + key + '\' from bucket \'' + bucket + '\'')
    })
}
