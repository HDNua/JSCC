// get child_process module.
var childproc = require('child_process');

// get os module.
var os = require('os');

// get os.platform()
var platform = os.platform();
console.log(platform);

// set procedure name by platform
var procName = null;
switch (platform) {
  case 'win32': // win32 or win64
    procName = 'nw';
    break;
    
  case 'linux':
    procName = 'nw';
    break;
    
  case 'darwin': // Mac OS X
    procName = 'nw';
    break;
}
 
// start process using child_process
//  with current path string
// '__dirname' would be not only path
//  of 'main.js' but also one of 'app.zip'
//  because 'main.js' and 'app.zip' have same directory
childproc.exec(procName + ' app.zip ' + __dirname);