var path = require('path')
var fs = require('fs')

var Promise = require('bluebird')
var _ = require('lodash')
var glob = Promise.promisify(require('glob'))

var AWS = require('aws-sdk')
AWS.config.region = 'us-west-2'
AWS.config.logger = process.stdout

var validateDirectory = require('../../utils').validateDirectory
var s3 = Promise.promisifyAll(new AWS.S3())
var readFile = Promise.promisify(fs.readFile)

module.exports = function (options) {
    var cwd = _.get(options, 'cwd')
    var bucket = _.get(options, 'bucket')
    var prefix = _.get(options, 'prefix')

    return validateDirectory(cwd).then(function (_cwd) {
        cwd = _cwd
        return validateBucket(bucket)
    }).then(function () {
        return uploadFiles(cwd, bucket, prefix)
    }).then(function (files) {
        return { cwd: cwd, bucket: bucket, prefix: prefix, files: files }
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

function uploadFiles(cwd, bucket, prefix) {
    return glob('configs/**/*.json', { cwd: cwd }).then(function (files) {
        var fileMap = []
        return Promise.all(
            _.map(files, function (file) {
                return readFile(path.resolve(cwd, file))
            })
        ).then(function (filesContents) {
            return Promise.all(
                _.map(filesContents, function (fileContents, idx) {
                    var key = (_.isString(prefix) && prefix.length > 0) ? path.join(prefix, files[idx]) : files[idx]
                    fileMap.push(files[idx] + ' -> ' + key)

                    return s3.putObjectAsync({
                        Bucket: bucket,
                        Key: key,
                        ACL: 'private',
                        Body: fileContents
                    })
                })
            )
        }).then(function() {
            return fileMap
        })
    })
}
