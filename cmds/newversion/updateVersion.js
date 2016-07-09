var Promise = require('bluebird')
var fs = require('fs')
var path = require('path')

var utils = require('../../utils')

var cp = utils.cp
var doesFileAlreadyExist = utils.doesFileAlreadyExist

var readFile = Promise.promisify(fs.readFile)
var writeFile = Promise.promisify(fs.writeFile)
var unlink = Promise.promisify(fs.unlink)

module.exports = function updateVersion(versionFile) {
    var backup = path.join(path.dirname(versionFile), '.' + path.basename(versionFile))
    var nextVersion

    return doesFileAlreadyExist(versionFile).then(function(exists) {
        if (!exists) {
            return writeFile(versionFile, JSON.stringify({"versions": []}, null, '  '), 'utf8')
        }
    }).then(function() {
        return cp(versionFile, backup)
    }).then(function() {
        return readFile(backup, 'utf8')
    }).then(function(backupContents) {
        var backupJSON = JSON.parse(backupContents)

        if (!Array.isArray(backupJSON.versions)) {
            throw new Error('Invalid versions file.  Should have \'versions\' array')
        }

        var prevVersionID = 0
        var length = backupJSON.versions.length
        if (length > 0) {
            prevVersionID = backupJSON.versions[length - 1].id
        }

        nextVersion = prevVersionID + 1

        backupJSON.versions.push({
            id: nextVersion,
            created_at: (new Date()).toISOString()
        })

        return writeFile(backup, JSON.stringify(backupJSON, null, '  '), 'utf8')
    }).then(function() {
        return cp(backup, versionFile)
    }).then(function() {
        return unlink(backup)
    }).then(function() {
        return nextVersion
    })
}
