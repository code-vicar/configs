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
    return utils.doesFileAlreadyExist(file).then(function (exists) {
        if (!exists) {
            return create(file, version)
        }
        return cp(file, version)
    })
}

function cp(file, version) {
    return utils.cp(file, getNewFileName(file, version))
}

function create(file, version) {
    return writeFile(getNewFileName(file, version), JSON.stringify({}), 'utf8')
}

function getNewFileName(file, version) {
    return path.join(path.dirname(file), 'config' + version + '.json')
}
