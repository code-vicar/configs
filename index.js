var program = require('commander')
var newversion = require('./cmds/newversion')

program.version('1.0.0')

program
    .command('newversion')
    .description('create new config versions')
    .option('-d, --cwd', 'Set current working directory')
    .action(function(options) {
        return newversion(options)
    })

program.parse(process.argv)
