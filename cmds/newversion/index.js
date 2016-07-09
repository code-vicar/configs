var path = require('path')
var fs = require('fs')

var Promise = require('bluebird')
var _ = require('lodash')
var fp = require('lodash/fp')

var createDirs = require('./createDirs')
var updateVersion = require('./updateVersion')
var createConfigs = require('./createConfigs')

var stat = Promise.promisify(fs.stat)

var folders = [
    './configs',
    './configs/DEV',
    './configs/QA',
    './configs/STAGING',
    './configs/LIVE'
]

var files = [
    './configs/DEV/config.json',
    './configs/QA/config.json',
    './configs/STAGING/config.json',
    './configs/LIVE/config.json'
]

var versionsFile = './configs/versions.json'

module.exports = function (options) {
    var cwd = _.get(options, 'cwd')
    return validateDirectory(cwd).then(function (cwd) {
        var mapFullPath = fp.map((item) => {
            return path.resolve(cwd, item)
        })

        var fullFolderPaths = mapFullPath(folders)
        var fullFilePaths = mapFullPath(files)
        var fullVersionFilePath = path.resolve(cwd, versionsFile)

        return createDirs(fullFolderPaths).then(function () {
            return updateVersion(fullVersionFilePath)
        }).then(function (versionNum) {
            return createConfigs(versionNum, fullFilePaths)
        })
    })
}

function validateDirectory(cwd) {
    if (!_.isNil(cwd)) {
        return stat(cwd).then(function (cwdStats) {
            if (!cwdStats.isDirectory()) {
                throw new Error('Invalid cwd option')
            }
            return cwd
        })
    } else {
        return Promise.resolve(__dirname)
    }
}
