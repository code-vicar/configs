#!/usr/bin/env node

var path = require('path')
var program = require('commander')

var cmds = require('./index.js')

program.version('1.0.2')
    .option('-d, --dir <dir>', 'set the cwd')

program
    .command('newversion')
    .description('create new config versions')
    .action(function() {
        var cwd = getCwd()
        return cmds.newversion({cwd:cwd}).then(function(version) {
            console.log('created version ' + version)
        })
    })

program
    .command('deploy')
    .option('-p, --prefix <prefix>', 'prefix to add to each uploaded file path')
    .arguments('<bucket>')
    .description('deploy configs')
    .action(function(bucket, options) {
        var cwd = getCwd()
        return cmds.deploy({cwd: cwd, bucket: bucket, prefix: options.prefix}).then(function(results) {
            if (results.files.length === 0) {
                console.log('no files deployed')
            } else {
                console.log('deployed files\n** local -> remote **\n' + JSON.stringify(results.files, null, '  ') + '\nto bucket ' + results.bucket)
            }
        })
    })

program
    .command('fetch')
    .arguments('<bucket> <version>')
    .option('-p, --prefix <prefix>', 'prefix to add to fetch file path')
    .option('-e, --env <env>', 'environment for which to fetch the config file (defaults to DEV)')
    .description('fetch a config file')
    .action(function(bucket, version, options) {
        var cwd = getCwd()
        return cmds.fetch({cwd: cwd, bucket: bucket, version: version, prefix: options.prefix, env: options.env}).then(function(results) {
            if (results.files.length === 0) {
                console.log('no files fetched')
            } else {
                console.log('fetched file\n** local -> remote **\n' + JSON.stringify(results.files, null, '  ') + '\nfrom bucket ' + results.bucket)
            }
        })
    })

function getCwd() {
    var cwd = process.cwd()

    if (program.dir) {
        cwd = path.resolve(cwd, program.dir)
    }

    return cwd
}

program.parse(process.argv)
