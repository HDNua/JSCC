/**
스트림을 관리하는 Stream 싱글톤 객체를 생성합니다.
*/
function initProgramStream(program) {
  var _stream = {}; // 빈 객체 생성
  
  /**
  스트림의 상위 형식인 BaseStream을 정의합니다.
  @param {string} streamName
  */
  function BaseStream(streamName) {
    this.streamName = streamName;
  }
  function stream_write(fmt) {
    var result; // 로그 스트림에 출력할 문자열을 보관합니다.
    var args = stream_write.arguments;
    if (args.length == 0) { // 인자의 수가 0이라면
      result = ''; // 개행만 합니다.
    }
    else if (args.length > 1) { // 인자의 수가 1보다 크면 format을 호출합니다.
      var params = Handy.toArray(args, 1); // 인자 목록 배열을 획득합니다.
      result = Handy.vformat(fmt, params); // 형식 문자열과 인자 목록을 같이 넘깁니다.
    }
    else { // 인자의 수가 1이면 그냥 출력합니다.
      result = fmt;
    }
    // 스트림에 출력합니다.
    var stream = document.getElementById(this.streamName);
    stream.value += (result);
  }
  function stream_writeln(fmt) {
    var result; // 로그 스트림에 출력할 문자열을 보관합니다.
    var args = stream_writeln.arguments;
    if (args.length == 0) { // 인자의 수가 0이라면
      result = ''; // 개행만 합니다.
    }
    else if (args.length > 1) { // 인자의 수가 1보다 크면 format을 호출합니다.
      var params = Handy.toArray(args, 1); // 인자 목록 배열을 획득합니다.
      result = Handy.vformat(fmt, params); // 형식 문자열과 인자 목록을 같이 넘깁니다.
    }
    else { // 인자의 수가 1이면 그냥 출력합니다.
      result = fmt;
    }
    // 스트림에 출력합니다.
    var stream = document.getElementById(this.streamName);
    stream.value += (result + NEWLINE);
  }
  function stream_clear() {
    // 스트림을 비웁니다.
    var stream = document.getElementById(this.streamName);
    stream.value = '';
  }
  BaseStream.prototype.write = stream_write;
  BaseStream.prototype.writeln = stream_writeln;
  BaseStream.prototype.clear = stream_clear;
  
  /**
  문자열을 스트림처럼 사용하기 위해 형식을 정의합니다.
  */
  function StringStream() {
    this.str = '';
  }
  function ss_write(fmt) {
    var result; // 로그 스트림에 출력할 문자열을 보관합니다.
    var args = ss_write.arguments;
    if (args.length == 0) { // 인자의 수가 0이라면
      result = ''; // 개행만 합니다.
    }
    else if (args.length > 1) { // 인자의 수가 1보다 크면 format을 호출합니다.
      var params = Handy.toArray(args, 1); // 인자 목록 배열을 획득합니다.
      result = Handy.vformat(fmt, params); // 형식 문자열과 인자 목록을 같이 넘깁니다.
    }
    else { // 인자의 수가 1이면 그냥 출력합니다.
      result = fmt;
    }
    // 스트림에 출력합니다.
    this.str += (result);
  }
  function ss_writeln(fmt) {
    var result; // 로그 스트림에 출력할 문자열을 보관합니다.
    var args = ss_writeln.arguments;
    if (args.length == 0) { // 인자의 수가 0이라면
      result = ''; // 개행만 합니다.
    }
    else if (args.length > 1) { // 인자의 수가 1보다 크면 format을 호출합니다.
      var params = Handy.toArray(args, 1); // 인자 목록 배열을 획득합니다.
      result = Handy.vformat(fmt, params); // 형식 문자열과 인자 목록을 같이 넘깁니다.
    }
    else { // 인자의 수가 1이면 그냥 출력합니다.
      result = fmt;
    }
    // 스트림에 출력합니다.
    this.str += (result + NEWLINE);
  }
  function ss_clear() {
    this.str = '';
  }
  StringStream.prototype.write = ss_write;
  StringStream.prototype.writeln = ss_writeln;
  StringStream.prototype.clear = ss_clear;
  
  // Stream 객체에 등록합니다.
  _stream.out = new BaseStream('outputStream');
  _stream.mem = new BaseStream('memoryStream');
  _stream.reg = new BaseStream('registerStream');
  _stream.exp = new BaseStream('expressionStream');
  _stream.log = new BaseStream('HandyLogStream');
  _stream.StringStream = StringStream;

  // 전역에 등록합니다.
  program.Stream = _stream;
}