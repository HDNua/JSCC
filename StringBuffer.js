/* StringBuffer.js */

/**
  StringBuffer 생성자 함수를 정의합니다.
  @param {string} s
*/
function StringBuffer(s) {
  this.str = (s != undefined) ? s : '';
  this.idx = 0;
}

/**
StringBuffer의 예외 형식인 StringBufferException을 정의합니다.
@param {string} msg
@param {StringBuffer} data
*/
function StringBufferException(msg, data) {
  this.description = msg;
  this.data = data;
}

// JavaScript에는 문법적으로 상속 기능이 없기 때문에
// prototype 객체를 이용하여 상속을 흉내냅니다.
StringBufferException.prototype = new Exception();

// toString 메서드를 오버라이드 합니다.
StringBufferException.prototype.toString = function() {
  // 상위 객체의 메서드를 호출하고 반환된 문자열 앞에 'StringBuffer'를 붙입니다.
  return 'StringBuffer' + Exception.prototype.toString.call(this);
}

/**
  버퍼를 문자열로 초기화합니다.
  @param {string} s
*/
StringBuffer.prototype.init = function(s) {
  this.str = (s != undefined) ? s : '';
  this.idx = 0;
};

/**
  버퍼로부터 문자를 하나 읽습니다. 포인터가 이동합니다.
  @return {string}
*/
StringBuffer.prototype.getc = function() {
  if (this.is_empty()) // 버퍼가 비었다면 null을 반환합니다.
    return null;
  return this.str[this.idx++]; // 다음 문자를 읽고 포인터를 옮깁니다.
}
/**
  버퍼의 포인터가 가리키는 문자를 가져옵니다. 포인터는 이동하지 않습니다.
  @return {string}
*/
StringBuffer.prototype.peekc = function() {
  if (this.is_empty()) // 버퍼가 비었다면 null을 반환합니다.
    return null;
  return this.str[this.idx];
}
/**
  버퍼에서 읽었던 값을 되돌립니다. 되돌릴 수 없으면 false를 반환합니다.
  @return {boolean}
*/
StringBuffer.prototype.ungetc = function() {
  if (this.idx > 0) {
    --this.idx;
    return true;
  }
  return false;
}

/**
  버퍼의 끝에 문자열을 추가합니다.
  @param {string} s
*/
StringBuffer.prototype.add = function(s) {
  this.str += s;
}

/**
  버퍼가 비어있다면 true, 값을 더 읽을 수 있다면 false를 반환합니다.
  @return {boolean}
*/
StringBuffer.prototype.is_empty = function() {
  return (this.idx >= this.str.length);
}

/**
  버퍼로부터 정수를 획득합니다.
  @return {string}
*/
StringBuffer.prototype.get_number = function() {
  this.trim(); // 공백 제거
  if (this.is_empty())
    return null; // 버퍼에 남은 문자가 없다면 null을 반환합니다.
  else if (is_digit(this.peekc()) == false) 
    return null; // 첫 문자가 숫자가 아니면 null을 반환합니다.
  
  // 정수를 획득합니다.
  var value = ''; // 획득한 정수에 대한 문자열 객체입니다.
  
  // 0이 먼저 발견되었다면 16진수입니다. 8진수는 고려하지 않습니다.
  if (this.peekc() == '0') {
    this.getc(); // 수를 획득합니다.
    
    if (this.is_empty()) // 더 획득할 수가 없다면 0을 반환합니다.
      return '0';
    
    // 다음에 나타난 문자가 'x'라면 16진수를 획득합니다.
    if (this.peekc() == 'x') {
      // 해석한 x는 지나갑니다.
      this.getc();
      // 16진수를 해석합니다.
      while (this.is_empty() == false) { // 버퍼에 데이터가 남아있는 동안
        // 16진수의 자릿수 문자가 아니면
        if ('0123456789abcdefABCDEF'.indexOf(this.peekc()) < 0)
          break; // 탈출합니다.
        value += this.getc(); // 문자를 반환할 문자열에 추가합니다.
      }
      // 획득한 16진수 문자열을 반환합니다.
      return '0x' + value;
    }
    // 아니라면 원래 수를 획득합니다.
    else {
      // 획득했던 정수 0을 되돌립니다.
      this.ungetc();
    }
  }
  
  // 10진수를 해석합니다.
  while (this.is_empty() == false) { // 버퍼에 값이 남아있는 동안
    if (is_digit(this.peekc()) == false) // 자릿수 문자가 아니면
      break; // 탈출합니다.
    value += this.getc(); // 문자를 반환할 문자열에 추가합니다.
  }
  return value;
}

/**
  버퍼로부터 식별자를 획득합니다.
  @return {string}
*/
StringBuffer.prototype.get_identifier = function() {
  this.trim(); // 공백 제거
  if (this.is_empty()) // 버퍼에 남은 문자가 없다면 예외
    return null;
  else if (is_fnamch(this.peekc()) == false)
    return null;
  var identifier = '';
  while (this.is_empty() == false) {
    if (is_namch(this.peekc()) == false) // 식별자 문자가 아니라면 탈출
      break;
    identifier += this.getc();
  }
  return identifier;
}

/**
  공백이 아닌 문자가 나올 때까지 포인터를 옮깁니다.
*/
StringBuffer.prototype.trim = function() {
  while (this.is_empty() == false) { // 버퍼에 문자가 남아있는 동안
    if (is_space(this.peekc()) == false) // 공백이 아닌 문자를 발견하면
      break; // 반복문을 탈출한다
    this.getc(); // 공백이면 다음 문자로 포인터를 넘긴다
  }
}

/**
  현재 위치 다음에 존재하는 토큰을 획득합니다.
  토큰 획득에 실패하면 null을 반환합니다.
  @return {string}
*/
StringBuffer.prototype.get_token = function() {
  this.trim(); // 공백 제거
  var ch = this.peekc();
  var result = null; // 문자열 스트림 생성
  
  if (is_digit(ch)) // 정수를 발견했다면 정수 획득
    result = this.get_number(); // cout 출력 스트림처럼 사용하면 된다
  else if (is_fnamch(ch)) // 식별자 문자를 발견했다면 식별자 획득
    result = this.get_identifier();
  else {
    if (ch == '"' || ch == "'") { // 문자열 기호의 시작이라면
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
    else if (ch == '[') { // 메모리의 시작이라면
      result = ''; // 반환할 수 있도록 문자열을 초기화합니다.
      this.getc(); // 이미 획득한 토큰이므로 넘어갑니다.
      while (this.is_empty() == false) { // 버퍼가 비어있는 동안
        if (this.peekc() == ']') // 닫는 대괄호가 나타났다면 탈출합니다.
          break;
        result += this.getc(); // 문자를 추가합니다.
      }
      this.getc(); // 추가된 문장: 마지막 닫는 대괄호는 사용했습니다.
      result = '[' + result + ']';
    }
    else { // 아니라면 일단 획득합니다.
      result = this.getc(); // this.get_operator();
    }
  }

  // 획득한 문자열이 없으면 null을 반환합니다.
  return (result != '' ? result : null); // 획득한 문자열을 반환한다
}