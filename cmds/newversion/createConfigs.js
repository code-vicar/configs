var path = require('path')
var fs = require('fs')

var Promise = require('bluebird')
var _ = require('lodash')

var utils = require('../../utils')

var writeFile = Promise.promisify(fs.writeFile)

module.exports = function (versionNum, files) {
    return Promise.reduce(files, function(x, file) {
        return copyOrCreate(file, versionNum)
    }, 0)
}

function copyOrCreate(file, version) {
    var prevFile = getPrevFileName(file, version)
    var nextFile = getNewFileName(file, version)
    return utils.doesFileAlreadyExist(prevFile).then(function (exists) {
        if (!exists) {
            return writeFile(nextFile, JSON.stringify({}, null, '  '), 'utf8')
        }
        return utils.cp(prevFile, nextFile)
    })
}

function getPrevFileName(file, version) {
    return path.join(path.dirname(file), 'config' + (version - 1) + '.json')
}

function getNewFileName(file, version) {
    return path.join(path.dirname(file), 'config' + version + '.json')
}
