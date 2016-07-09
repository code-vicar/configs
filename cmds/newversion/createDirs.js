var Promise = require('bluebird')
var fs = require('fs')

var _ = require('lodash')

var doesDirectoryAlreadyExist = require('../../utils').doesDirectoryAlreadyExist
var mkdir = Promise.promisify(fs.mkdir)

module.exports = function createDirs(folders) {
    return Promise.reduce(folders, function(x, folder) {
        return doesDirectoryAlreadyExist(folder).then(function(exists) {
            if (!exists) {
                return mkdir(folder)
            }
        })
    }, 0)
}
