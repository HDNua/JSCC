/**
C 프로그래밍 언어 컴파일러입니다.
*/
function initProgramCompiler(program) {
  var compiler = {};
  
  // 속성 정의 이전에 정의해야 하는 내용 작성
  /**
  Compiler 모듈의 메서드를 수행할 때 발생하는 예외를 정의합니다.
  @param {string} msg
  */
  function CompilerException(msg, data) {
    this.description = msg;
    this.data = data;
  }
  CompilerException.prototype = new Exception();
  CompilerException.prototype.toString = function() {
    return 'Compiler' + Exception.prototype.toString.call(this);
  };
  /**
    버퍼로부터 C 특수 토큰을 획득합니다.
    @return {string}
  */
  StringBuffer.prototype.get_extra = function() {
    if (this.is_empty())
      return null;
    
    var ch = this.getc(); // 현재 문자를 획득하고 포인터를 이동합니다.
    var nextCh = this.peekc(); // 다음 문자를 획득합니다.
    var op = ch;
    switch (ch) { // 획득한 문자에 따라 분기합니다.
      case '+': // 획득한 토큰에 문자를 덧붙일 수 있는지 확인합니다.
        if ('+='.indexOf(nextCh) >= 0) // 다음 문자를 덧붙일 수 있다면,
          op += this.getc(); // 토큰을 덧붙입니다.
        break;
      case '-':
        if ('-=>'.indexOf(nextCh) >= 0) // [ - -- -= -> ]
          op += this.getc();
        break;
      case '*': // [ * *= */ ]
        if ('=/'.indexOf(nextCh) >= 0) op += nextCh;
        break;
      case '/': // [ / /= // /* ]
        if ('=/*'.indexOf(nextCh) >= 0)
          op += this.getc();
        break;
      case '.': // 가변 인자를 표현하는 "..." 토큰인지 검사합니다.
        if (String.prototype.substr(this.idx, 2) == '..') {
          this.idx += 2;
          op = '...';
        }
        break;
      case '<': // [ < << <= <<= ]
        if (nextCh == '<') { // << 또는 <<=
          op += this.getc();
          nextCh = this.peekc();
          if (nextCh == '=')
            op += this.getc();
        }
        else if ('<='.indexOf(nextCh) >= 0)
          op += this.getc();
        break;
      case '>': // [ > >> >= >>= ]
        if (nextCh == '>') { // >> 또는 >>=
          op += this.getc();
          nextCh = this.peekc();
          if (nextCh == '=')
            op += this.getc();
        }
        else if ('>='.indexOf(nextCh) >= 0)
          op += this.getc();
        break;
      case '&': // [ & &= && ]
        if ('=&'.indexOf(nextCh) >= 0) op += nextCh;
        break;
      case '|': // [ | |= || ]
        if ('=|'.indexOf(nextCh) >= 0) op += nextCh;
        break;
      case '%': // [ % %= ]
      case '=': // [ = == ]
      case '!': // [ ! != ]
      case '^': // [ ^ ^= ]
        if (nextCh == '=') op += this.getc();
        break;
      case '~':
        break;
    }
    
    return op;
  }
  /**
    버퍼로부터 C 토큰을 획득합니다.
    @return {string}
  */
  StringBuffer.prototype.get_ctoken = function() {
    this.trim(); // 공백 제거
    var ch = this.peekc();
    var result = null; // 문자열 스트림 생성

    if (is_digit(ch)) // 정수를 발견했다면 정수 획득
      result = this.get_number(); // cout 출력 스트림처럼 사용하면 된다
    else if (is_fnamch(ch)) // 식별자 문자를 발견했다면 식별자 획득
      result = this.get_identifier();
    else if (ch == '"' || ch == "'") { // 문자열 기호의 시작이라면
      result = ''; // 반환할 수 있도록 문자열을 초기화합니다.
      var quot = this.getc(); // 따옴표의 쌍을 맞출 수 있도록 따옴표를 보관합니다.

      while (this.is_empty() == false) { // 버퍼에 문자가 있는 동안
        var sch = this.peekc(); // 문자를 획득합니다.

        if (sch == '\\') { // '\' 특수기호라면 이스케이프 시퀀스를 처리합니다.
          this.getc(); // 이미 획득한 문자는 넘어갑니다.
          var next = this.getc(); // \ 다음의 문자를 획득합니다.
          var ech = null; // 획득할 이스케이프 시퀀스입니다.

          switch (next) { // 문자에 맞게 조건 분기합니다.
            case 'n': ech = '\n'; break;
            case 'r': ech = '\r'; break;
            case 't': ech = '\t'; break;
            case '0': ech = '\0'; break;
            case '\\': ech = '\\'; break;
            default:
              throw new StringBufferException
                ("invalid escape sequence");
          }
          result += ech; // 획득한 이스케이프 시퀀스를 붙입니다.
        }
        else if (sch == quot) { // 같은 따옴표가 나왔다면 문자열 획득을 마칩니다.
          this.getc();
          break;
        }
        else { // 나머지 문자는 result에 붙입니다.
          result += this.getc();
        }
      }
      result = quot + result + quot;
    }
    else { // 그 외의 경우 특수 토큰을 획득합니다.
      result = this.get_extra();
    }

    // 획득한 문자열이 없으면 null을 반환합니다.
    return (result != '' ? result : null); // 획득한 문자열을 반환한다
  }
  
  initProgramCompilerTranslator(compiler, CompilerException);
  initProgramCompilerDeclaration(compiler, CompilerException);
  initProgramCompilerExpression(compiler, CompilerException);
  initProgramCompilerStatement(compiler, CompilerException);
  
  // 메서드 작성
  /**
  C언어로 작성된 파일을 목적 파일로 변환합니다.
  @param {string} filename
  */
  function compile(filename) {
    var Translator = Program.Compiler.Translator;
    
    // 파일 텍스트를 가져옵니다. 실패하면 예외 처리합니다.
    var filedata = HandyFileSystem.load(filename);
    if (filedata == null)
      throw new CompilerException('cannot open file ', filename);
    
    // 컴파일을 수행합니다.
    Translator.translate(filedata);
    
    // 컴파일한 결과를 파일에 출력합니다.
    var dataseg = Translator.segment.data;
    var codeseg = Translator.segment.code;
    var outputName = Handy.format
      ('%s.hdo', filename.substr(0, filename.length-2));
    var output = new Program.Stream.StringStream();
    output.writeln('.data');      // 데이터 세그먼트의 시작을 알립니다.
    output.writeln(dataseg.str);  // 데이터 세그먼트의 정보를 기록합니다.
    output.writeln('.code');      // 코드 세그먼트의 시작을 알립니다.
    output.writeln(codeseg.str);  // 코드 세그먼트의 정보를 기록합니다.
    output.write('end _main');    // _main 프로시저에서 시작함을 알립니다.
    HandyFileSystem.save(outputName, output.str); // 파일에 출력합니다.
    
    // 컴파일이 성공했음을 알립니다.
    log('compile complete');
    return 0; // 반환하는 값이 0이 아니면 프로그램을 중단합니다.
  }
  
  compiler.compile = compile;
  program.Compiler = compiler;
}