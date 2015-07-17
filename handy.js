/**
  @param {string} msg
  @param {object} data
*/
function Exception(msg, data) {
  this.description = msg;
  this.data = (data != undefined) ? data : null;
}
Exception.prototype.toString = function() {
  var type = 'Exception: ';
  var message = this.description;
  var data = (this.data != undefined) ? this.data.toString() : '';
  return type + message + ' [' + data + ']';
}

/**
  로그 스트림에 문자열을 출력합니다.
  @param {string} fmt
*/
function log(fmt) {
  var result; // 로그 스트림에 출력할 문자열을 보관합니다.
  if (log.arguments.length == 0) { // 인자의 수가 0이라면
    result = ''; // 개행만 합니다.
  }
  else if (log.arguments.length > 1) { // 인자의 수가 1보다 크면 format을 호출합니다.
    var params = Handy.toArray(log.arguments, 1); // 인자 목록 배열을 획득합니다.
    result = Handy.vformat(fmt, params); // 형식 문자열과 인자 목록을 같이 넘깁니다.
  }
  else { // 인자의 수가 1이면 그냥 출력합니다.
    result = fmt;
  }
  // 로그 스트림에 출력합니다.
  var logStream = document.getElementById('HandyLogStream');
  logStream.value += (result + NEWLINE);
}

/**
  value가 undefined라면 기본 값을, 아니면 그대로 반환합니다.
*/
function getValid(value, defaultValue) {
  return (value != undefined) ? value : defaultValue;
}

/**
  HandyFileSystem 싱글톤 객체를 생성하고 초기화합니다.
*/
function initHandyFileSystem() {
  
  // HandyFileSystem 싱글톤 객체를 정의합니다.
  // 빈 객체를 먼저 생성함에 주의합니다.
  var hfs = {};
  
  // 파일 시스템 객체를 획득합니다.
  var fso = require('fs');
  
  // 현재 작업중인 파일의 디렉터리를 획득합니다.
  var gui = require('nw.gui');
  var dir = gui.App.argv[0];
  
  /**
  // 파일에 기록된 텍스트를 모두 불러와 문자열로 반환합니다.
  // 성공하면 획득한 문자열, 실패하면 null을 반환합니다.
  @param {string} filename
  @return {string}
  */
  function load(filename) {
    try {
      var filepath = this.dir + '\\' + filename;
      return this.fso.readFileSync(filepath);
    } catch (ex) {
      return null;
    }
  }
  /**
  // 파일에 텍스트를 기록합니다.
  // 기록에 성공하면 true, 실패하면 false를 반환합니다.
  @param {string} filename
  @return {Boolean}
  */
  function save(filename, data) {
    try {
      var filepath = this.dir + '\\' + filename;
      this.fso.writeFileSync(filepath, data);
      return true;
    } catch (ex) {
      return false;
    }
  }
  /**
  // 파일이 디스크에 존재하는지 확인합니다.
  @param {string} filepath
  @return {Boolean}
  */
  function exists(filepath) {
    return this.fso.exists(filepath);
  }
  
  // 정의한 속성을 HandyFileSystem 싱글톤 객체의 멤버로 정의합니다.
  hfs.fso = fso;
  hfs.dir = dir;
  hfs.load = load;
  hfs.save = save;
  hfs.exists = exists;
  
  // 전역 객체를 의미하는 window 객체에 HandyFileSystem 속성을 추가하고
  // 생성한 HandyFileSystem 싱글톤 객체를 대입합니다.
  window['HandyFileSystem'] = hfs;
}

var NEWLINE = '\r\n';

/**
Handy 라이브러리 기본 객체인 Handy 싱글톤 객체를 초기화합니다.
*/
function initHandy() {
  var handy = {}; // 빈 객체 생성
  
  /**
  형식화된 문자열을 반환합니다.
  @param {string} fmt
  @param {Array} params
  @return {string}
  */
  function vformat(fmt, params) {
    var value;
    var result = ''; // 반환할 문자열입니다.

    // fmt의 모든 문자에 대해 반복문을 구성합니다.
    // pi는 인자의 인덱스를 의미합니다.
    var i, pi, len;
    for (i=0, pi=0, len=fmt.length; i<len; ++i) {
      var c = fmt.charAt(i); // i번째 문자를 획득합니다.

      if (c == '%') { // 퍼센트 기호라면 특별하게 처리합니다.
        // % 기호 다음의 문자를 가져옵니다.
        var nextChar = fmt.charAt(++i);

        // 옵션을 먼저 획득합니다.
        var showLeft = false; // 기본적으로 오른쪽 정렬합니다.
        var fillZero = false; // 기본적으로 여백을 공백으로 채웁니다.
        switch (nextChar) {
          case '0': // 이 옵션이 적용되면 여백을 0으로 채웁니다.
            fillZero = true;
            // 다음 문자를 다시 얻습니다.
            nextChar = fmt.charAt(++i);
            break;
          case '-': // 이 옵션이 적용되면 왼쪽 정렬합니다.
            showLeft = true;
            // 다음 문자를 다시 얻습니다.
            nextChar = fmt.charAt(++i);
            break;
        }

        // 여백의 크기를 획득합니다.
        // nextChar가 숫자인 동안 크기를 획득합니다.
        var width = 0;
        while ('0123456789'.indexOf(nextChar) >= 0) {
          // 길이를 획득합니다. get_number 구현을 참조하십시오.
          width = width * 10 + (nextChar - '0');
          // 다음 문자를 다시 얻습니다.
          nextChar = fmt.charAt(++i);
        }
        
        // 인자를 획득하고 타당하게 만듭니다.
        var param = params[pi++];
        if (param === undefined)
          param = 'undefined';
        else if (param === null)
          param = 'null';

        // 가져온 문자를 기준으로 조건 분기합니다.
        switch (nextChar) {
          case 'b': // 2진수를 출력합니다.
            value = param.toString(2);
            break;
          case 'x': // 16진수를 출력합니다.
            value = param.toString(16);
            break;
          case 'd': // 정수를 출력합니다.
            value = param.toString();
            break;
          case 's': // 문자열을 출력합니다.
            value = param;
            break;
          case 'c': // 문자 코드에 해당하는 문자를 출력합니다.
            // 문자열이라면 첫 번째 글자만 획득합니다.
            if (typeof(param) == 'string') {
              value = param.charAt(0);
            }
            else { // 그 외의 경우 정수로 간주합니다.
              value = String.fromCharCode(param);
            }
            break;
          case '%': // 퍼센트를 출력합니다.
            --pi; // 인자를 사용하지 않았으므로 되돌립니다.
            value = '%';
            break;
        }

        // 정상적으로 값을 획득하지 못한 경우 undefined를 출력합니다.
        if (value == undefined) {
          value = 'undefined';
        }

        // 옵션을 문자열에 반영합니다.
        if (showLeft) { // 왼쪽 정렬 옵션입니다.
          var space = ''; // 여백 문자열입니다.
          // 주어진 크기만큼 여백을 확보합니다.
          for (var si=0, slen=width - value.length; si<slen; ++si)
            space += ' ';
          // 옵션을 반영합니다.
          value = value + space;
        }
        else if (fillZero) { // 공백을 0으로 채우는 옵션입니다.
          var space = ''; // 여백 문자열입니다.
          // 주어진 크기만큼 여백을 확보합니다.
          for (var si=0, slen=width - value.length; si<slen; ++si)
            space += '0';
          // 옵션을 반영합니다.
          value = space + value;
        }
        else if (width > 0) { // 두 옵션 없이 크기만 주어진 경우입니다.
          var space = ''; // 여백 문자열입니다.
          // 주어진 크기만큼 여백을 확보합니다.
          for (var si=0, slen=width - value.length; si<slen; ++si)
            space += ' ';
          // 옵션을 반영합니다.
          value = space + value;
        }

        // 해석한 문자열을 붙입니다.
        result += value;
      }
      // 퍼센트 기호가 아니라면 그냥 붙입니다.
      else { 
        result += c;
      }
    }

    // 문자열을 반환합니다.
    return result;
  }
  
  /**
  형식화된 문자열을 반환합니다.
  @param {string} fmt
  @return {string}
  */
  function format(fmt) {
    // 1번 인수부터 끝 인수까지의 인수들을 배열로 만들어서 vformat의 인자로 넘깁니다.
    return Handy.vformat(fmt, toArray(format.arguments, 1));
  }
  
  /**
  리스트 객체의 부분집합을 배열 객체로 변환하여 반환합니다.
  @param {number} startIndex
  @param {number} endIndex
  @return {Array}
  */
  function toArray(list, startIndex, endIndex) {
    // 시작 인덱스와 끝 인덱스의 기본 값을 설정합니다.
    startIndex = getValid(startIndex, 0);
    endIndex = getValid(endIndex, list.length-1);
    
    // 배열을 복사합니다.
    var arr = new Array();
    for (var i=startIndex; i<=endIndex; ++i) {
      arr[arr.length] = (list[i]);
    }
    
    // 복사한 배열을 반환합니다.
    return arr;
  }
  
  // 객체에 등록합니다.
  handy.format = format;
  handy.vformat = vformat;
  handy.toArray = toArray;
  
  // 전역에 등록합니다.
  window.Handy = handy;
}