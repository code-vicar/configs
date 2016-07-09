var path = require('path')
var fs = require('fs')

var Promise = require('bluebird')
var expect = require('chai').expect
var del = require('del')
var _ = require('lodash')

var newversion = require('../cmds/newversion')
var cp = require('../utils').cp

var stat = Promise.promisify(fs.stat)
var open = Promise.promisify(fs.open)
var writeFile = Promise.promisify(fs.writeFile)
var readFile = Promise.promisify(fs.readFile)
var mkdirp = Promise.promisify(require('mkdirp'))

var configsFolderPath = path.resolve(__dirname, './configs')

describe('newversion', function () {
    beforeEach(function (done) {
        del([configsFolderPath]).then(function () {
            done()
        }).catch(done)
    })
    afterEach(function (done) {
        del([configsFolderPath]).then(function () {
            done()
        }).catch(done)
    })

    describe('creating directories', function () {
        willCreatesFolders()
    })

    describe('versions file', function () {
        it('should create configs/.versions file if it doesn\'t exist', function (done) {
            newversion({ cwd: __dirname }).then(function () {
                return open(path.resolve(configsFolderPath, 'versions.json'), 'r')
            }).then(function () {
                done()
            }).catch(done)
        })

        it('should not overrwite configs/.versions if it already exists', function (done) {
            mkdirp(configsFolderPath).then(function () {
                return cp(path.resolve(__dirname, 'fixtures', 'versions.json'), path.resolve(configsFolderPath, 'versions.json'))
            }).then(function () {
                return newversion({ cwd: __dirname })
            }).then(function () {
                return Promise.all([
                    readFile(path.resolve(configsFolderPath, 'versions.json'), 'utf8'),
                    readFile(path.resolve(__dirname, 'fixtures', 'versions.json'), 'utf8')
                ])
            }).spread(function (output, src) {
                var outJSON = JSON.parse(output)
                var srcJSON = JSON.parse(src)
                expect(outJSON.versions[0]).to.eql(srcJSON.versions[0])
            }).then(done).catch(done)
        })

        it('should increment version number', function (done) {
            mkdirp(configsFolderPath).then(function () {
                return cp(path.resolve(__dirname, 'fixtures', 'versions.json'), path.resolve(configsFolderPath, 'versions.json'))
            }).then(function () {
                return newversion({ cwd: __dirname })
            }).then(function () {
                return Promise.all([
                    readFile(path.resolve(configsFolderPath, 'versions.json'), 'utf8'),
                    readFile(path.resolve(__dirname, 'fixtures', 'versions.json'), 'utf8')
                ])
            }).spread(function (output, src) {
                var outJSON = JSON.parse(output)
                var srcJSON = JSON.parse(src)
                expect(outJSON.versions[1].id).to.eql(srcJSON.versions[0].id + 1)
            }).then(done).catch(done)
        })
    })

    describe('config files', function () {
        describe('no pre-existing versions', function () {
            willCreateNewConfigFiles(1)
        })

        describe('pre-existing versions', function () {
            beforeEach(function (done) {
                return mkdirp(path.join(configsFolderPath, 'DEV')).then(function () {
                    return Promise.all([
                        cp(path.resolve(__dirname, 'fixtures', 'versions.json'), path.resolve(configsFolderPath, 'versions.json')),
                        cp(path.resolve(__dirname, 'fixtures', 'DEV', 'config1.json'), path.join(configsFolderPath, 'DEV', 'config1.json'))
                    ])
                }).then(function() {
                    done()
                }).catch(done)
            })

            willCreateNewConfigFiles(2)

            it('should preserve contents of previous config file', function (done) {
                var configFile = path.resolve(configsFolderPath, 'DEV', 'config1.json')
                var newConfigFile = path.resolve(configsFolderPath, 'DEV', 'config2.json')
                return newversion({ cwd: __dirname }).then(function () {
                    return Promise.all([
                        readFile(configFile, 'utf8'),
                        readFile(newConfigFile, 'utf8')
                    ])
                }).spread(function (configFileContents, newConfigFileContents) {
                    expect(configFileContents).to.be.equal(newConfigFileContents)
                }).then(done).catch(done)
            })
        })
    })
})

function willCreatesFolders() {
    var folders = [
        'configs',
        'configs/QA',
        'configs/DEV',
        'configs/STAGING',
        'configs/LIVE'
    ]

    var i, folder
    for (i = 0; i < folders.length; i++) {
        folder = folders[i];
        (function (folder) {
            it('should create ' + folder + ' folder if it does not exist', function (done) {
                newversion({ cwd: __dirname }).then(function () {
                    return stat(path.resolve(__dirname, folder))
                }).then(function (stats) {
                    expect(stats.isDirectory()).to.be.true
                }).then(done).catch(done)
            })

            it('should not create ' + folder + ' folder if it already exists', function (done) {
                mkdirp(path.resolve(__dirname, folder)).then(function () {
                    return open(path.resolve(__dirname, folder, 'test'), 'w')
                }).then(function () {
                    return newversion({ cwd: __dirname }).then(function () {
                        return stat(path.resolve(__dirname, folder, 'test'))
                    }).then(function (stats) {
                        expect(stats.isFile()).to.be.true
                    })
                }).then(done).catch(done)
            })

        })(folder)
    }
}

function willCreateNewConfigFiles(versionNum) {
    var files = [
        'configs/DEV/config' + versionNum + '.json',
        'configs/QA/config' + versionNum + '.json',
        'configs/STAGING/config' + versionNum + '.json',
        'configs/LIVE/config' + versionNum + '.json'
    ]

    _.forEach(files, function (file) {
        var fullFilePath = path.resolve(__dirname, file)

        it('should create file ' + file, function (done) {
            this.timeout(1000000)
            return newversion({ cwd: __dirname }).then(function () {
                return stat(fullFilePath)
            }).then(function (stats) {
                expect(stats.isFile()).to.be.true
            }).then(done).catch(done)
        })
    })
}
