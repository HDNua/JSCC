// get child_process module.
var childproc = require('child_process');

// get os module.
var os = require('os');

// get os.platform()
var platform = os.platform();
console.log(platform);

// set nwjs binary name by platform
var execName = 'nw';
switch (platform) {
  case 'win32': // win32 or win64
    execName = 'nw';
    break;
    
  case 'linux':
    execName = 'nw';
    break;
    
  case 'darwin': // Mac OS X
    execName = 'nw';
    break;
}
var execArgv = ['app.zip', __dirname, platform];

// start process using child_process
//  with current path string
// '__dirname' would be not only path
//  of 'main.js' but also one of 'app.zip'
//  because 'main.js' and 'app.zip' have same directory
childproc.exec(execName + ' ' + execArgv.join(' '));