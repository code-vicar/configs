var path = require('path')
var program = require('commander')

var newversion = require('./cmds/newversion')

program.version('1.0.0')

program
    .command('newversion')
    .arguments('[dir]')
    .description('create new config versions')
    .action(function(dir) {
        var cwd = __dirname

        if (dir) {
            cwd = path.resolve(__dirname, dir)
        }

        return newversion({cwd:cwd}).then(function(version) {
            console.log('created version ' + version)
        })
    })

program.parse(process.argv)
