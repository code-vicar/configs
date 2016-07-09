var path = require('path')
var fs = require('fs')

var Promise = require('bluebird')
var _ = require('lodash')
var fp = require('lodash/fp')

var validateDirectory = require('../../utils').validateDirectory

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
        var versionNum

        return createDirs(fullFolderPaths).then(function () {
            return updateVersion(fullVersionFilePath)
        }).then(function (_versionNum) {
            versionNum = _versionNum
            return createConfigs(_versionNum, fullFilePaths)
        }).then(function() {
            return versionNum
        })
    })
}
