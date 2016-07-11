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
            console.log('deployed files\nlocal -> remove\n' + JSON.stringify(results.files, null, '  ') + '\nto bucket ' + results.bucket)
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
