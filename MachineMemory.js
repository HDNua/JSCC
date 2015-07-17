/**
가상 머신이 소유하는 가상 메모리입니다.
*/
function initMachineMemory(machine) {
  var memory = {}; // 싱글톤 객체 생성

  // 상수 정의
  var MAX_MEMORY_SIZ = 1024;

  // 속성 정의 이전에 정의해야 하는 내용 작성
  /**
  Memory 모듈의 메서드를 수행할 때 발생하는 예외를 정의합니다.
  @param {string} msg
  */
  function MemoryException(msg, data) {
    this.description = msg;
    this.data = data;
  }
  MemoryException.prototype = new Exception();
  MemoryException.prototype.toString = function() {
    return 'Memory' + Exception.prototype.toString.call(this);
  };
  
  // 필드 정의
  memory.byteArr = new Array(MAX_MEMORY_SIZ); // 메모리 바이트 배열 정의
  memory.bytePtr = 0; // 메모리를 가리키는 바이트 포인터 정의
  
  /**
  바이트 배열에서 바이트를 획득합니다.
  @return {number}
  */
  function read_byte() {
    return this.byteArr[this.bytePtr++];
  }
  /**
  value를 바이트로 변환한 값을 기록합니다.
  @param {number} value
  */
  function write_byte(value) {
    this.byteArr[this.bytePtr++] = (value & 0xFF);
  }
  /**
  바이트 배열에서 index 주소에 있는 바이트를 획득합니다.
  @param {number} index
  @return {number}
  */
  function get_byte(index) {
    return this.byteArr[index];
  }
  /**
  value를 바이트로 변환한 값을 index 주소에 기록합니다.
  @param {number} value
  @param {number} index
  */
  function set_byte(value, index) {
    this.byteArr[index] = (value & 0xFF);
  }
  
  /**
  바이트 배열에서 워드를 획득합니다.
  @return {number}
  */
  function read_word() {
    var byte1 = this.read_byte(); // 첫 번째 바이트 XY을 획득합니다.
    var byte2 = this.read_byte(); // 두 번째 바이트 ZW를 획득합니다.
//    var word = ((byte2 << 8) | byte1); // 결과 값은 ZWXY입니다.
//    return word;
    return ((byte2 << 8) | byte1);
  }
  /**
  value를 워드로 변환한 값을 기록합니다.
  @param {number} value
  */
  function write_word(value) {
    this.write_byte(value & 0xFF);  // 첫 번째 바이트를 기록합니다.
    value >>= 8;                    // 다음에 기록할 바이트로 value 값을 옮깁니다.
    this.write_byte(value & 0xFF);  // 두 번째 바이트를 기록합니다.
  }
  /**
  바이트 배열에서 index 주소에 있는 워드를 획득합니다.
  @param {number} index
  @return {number}
  */
  function get_word(index) {
    var byte1 = this.get_byte(index); // 첫 번째 바이트를 획득합니다.
    var byte2 = this.get_byte(index+1); // 두 번째 바이트를 획득합니다.
    return ((byte2 << 8) | byte1); // 워드를 반환합니다.
  }
  /**
  value를 워드로 변환한 값을 index 주소에 기록합니다.
  @param {number} value
  @param {number} index
  */
  function set_word(value, index) {
    this.set_byte(value & 0xFF, index); // 첫 번째 바이트를 기록합니다.
    value >>= 8; // 다음에 기록할 바이트로 value 값을 옮깁니다.
    this.set_byte(value & 0xFF, index+1); // 두 번째 바이트를 기록합니다.
  }
  
  /**
  더블 워드를 획득합니다.
  @return {number}
  */
  function read_dword() {
    var byte1 = this.read_byte();
    var byte2 = this.read_byte();
    var byte3 = this.read_byte();
    var byte4 = this.read_byte();
    var dword = (
      (byte4 << 24)
      | (byte3 << 16)
      | (byte2 << 8)
      | byte1);
    return dword;
  }
  /**
  더블 워드를 기록합니다.
  @param {number} value
  */
  function write_dword(value) {
    this.write_byte(value); value >>= 8;
    this.write_byte(value); value >>= 8;
    this.write_byte(value); value >>= 8;
    this.write_byte(value);
  }
  /**
  index에서 더블 워드를 획득합니다.
  @param {number} index
  @return {number}
  */
  function get_dword(index) {
    var byte1 = this.get_byte(index);
    var byte2 = this.get_byte(index+1);
    var byte3 = this.get_byte(index+2);
    var byte4 = this.get_byte(index+3);
    var dword = (
      (byte4 << 24)
      | (byte3 << 16)
      | (byte2 << 8)
      | byte1);
    return dword;
  }
  /**
  index에 더블 워드를 기록합니다.
  @param {number} value
  @param {number} index
  */
  function set_dword(value, index) {
    this.set_byte(value, index); value >>= 8;
    this.set_byte(value, index+1); value >>= 8;
    this.set_byte(value, index+2); value >>= 8;
    this.set_byte(value, index+3);
  }
  
  /**
  메모리의 전체 크기를 반환합니다.
  @return {number}
  */
  function GetMaxMemorySize() {
    return MAX_MEMORY_SIZ;
  }
  
  /**
  메모리를 출력합니다.
  */
  function show() {
    var mem_str = ''; // 모든 메모리 텍스트를 보관하는 변수
    var mem_addr = ''; // 메모리 텍스트 줄을 보관하는 변수
    var mem_byte = ''; // 바이트 텍스트를 보관하는 변수
    var mem_char = ''; // 아스키 문자 텍스트를 보관하는 변수
    
    var addr_beg = 0; // 보여주기 시작하려는 메모리의 시작 주소
    var addr_end = Machine.Memory.MaxSize() - 1; // 메모리의 끝 주소
    
    // 모든 메모리의 바이트를 탐색합니다.
    for (var i=0; (addr_beg+i <= addr_end); ++i) {
      var addr = addr_beg + i; // 주소를 얻습니다.

      if (i % 16 == 0) { // 출력 중인 바이트의 인덱스가 16의 배수라면
        // 개행합니다.
        mem_str += Handy.format
          ('0x%04x | %-48s| %-16s \n', mem_addr, mem_byte, mem_char);
        
        // 표현하려는 주소 값을 16진수로 표시합니다.
        var addr_str = Number(addr).toString(16);
        
        // 다른 값을 초기화합니다.
        mem_addr = addr_str;
        mem_byte = '';
        mem_char = '';
      }
      
      // 획득한 주소의 바이트 값을 얻습니다.
      var byte = Machine.Memory.get_byte(addr);
      
      // 초기화되지 않은 메모리라면 0을 대입합니다.
      if (byte == undefined)
        byte = 0;
      
      // 바이트 값으로부터 문자를 획득합니다.
      var ascii = String.fromCharCode(byte);
      
      // 이스케이프 시퀀스인 경우에 대해 처리합니다.
      switch (ascii) {
        case '\0': ascii = '.'; break;
        case '\n': ascii = ' '; break;
        case '\t': ascii = ' '; break;
        case '\r': ascii = ' '; break;
      }
      
      // 각각의 문자열에 추가합니다.
      mem_byte += Handy.format('%02x ', byte);
      mem_char += ascii;
    }
    
    // 마지막 줄이 출력되지 않았다면 출력합니다.
    if (addr_beg + i == addr_end + 1) {
      mem_str += Handy.format
        ('0x%04x | %-48s| %-16s \n', mem_addr, mem_byte, mem_char);
    }
    // log(mem_str);
    Program.Stream.mem.writeln(mem_str);
  }
  
  /**
  주어진 인자가 메모리인지 판정합니다.
  @param {string} param
  @return {boolean}
  */
  function is_memory(param) {
    return ((param.charAt(0) == '[')
            && (param.charAt(param.length-1) == ']'));
  }
  /**
  주어진 메모리로부터 4바이트 값을 획득합니다.
  @param {string} param
  @return {number}
  */
  function get_memory_value(param) {
    var Register = Machine.Processor.Register;
    var addr; // 값을 가져올 메모리의 주소 값입니다.
    
    // 대괄호를 제외한 문자열을 획득하고, 이를 이용해 버퍼를 생성합니다.
    var buffer = new StringBuffer(param.slice(1, param.length-1));
    
    // 가장 앞은 언제나 레지스터입니다.
    var reg = buffer.get_token();
    
    // 획득한 레지스터가 보관하고 있는 값을 획득합니다.
    var regval = Register.get(reg);
    
    // 다음 토큰을 획득합니다.
    var op = buffer.get_token();
    if (op == null) { // 다음 토큰이 존재하지 않는다면 [reg] 형식입니다.
      addr = regval;
    }
    else if (op == '+') {
      var imm = parseInt(buffer.get_token());
      addr = regval + imm;
    }
    else if (op == '-') {
      var imm = parseInt(buffer.get_token());
      addr = regval - imm;
    }
    else
      throw new MemoryException("invalid memory token");
    
    // 획득한 위치에 존재하는 4바이트 값을 획득합니다.
    return Machine.Memory.get_dword(addr);
  }
  /**
  메모리에 4바이트 값을 기록합니다.
  @param {string} dst
  @param {number} src
  */
  function set_memory_value(dst, src) {
    var Register = Machine.Processor.Register;
    var addr; // 값을 설정할 메모리의 주소 값입니다.
    
    // 대괄호를 제외한 문자열을 획득하고, 이를 이용해 버퍼를 생성합니다.
    var buffer = new StringBuffer(dst.slice(1, dst.length-1));
    
    // 가장 앞은 언제나 레지스터입니다.
    var reg = buffer.get_token();
    
    // 획득한 레지스터가 보관하고 있는 값을 획득합니다.
    var regval = Register.get(reg);
    
    // 다음 토큰을 획득합니다.
    var op = buffer.get_token();
    if (op == null) { // 다음 토큰이 존재하지 않는다면 [reg] 형식입니다.
      addr = regval;
    }
    else if (op == '+') {
      var imm = parseInt(buffer.get_token());
      addr = regval + imm;
    }
    else if (op == '-') {
      var imm = parseInt(buffer.get_token());
      addr = regval - imm;
    }
    else
      throw new MemoryException("invalid memory token");
    
    // 획득한 위치에 4바이트 값을 설정합니다.
    return Machine.Memory.set_dword(src, addr);
  }
  
  /**
  메모리 문자열이 가리키는 주소를 획득합니다.
  @param {string} param
  @return {number}
  */
  function get_memory_address(param) {
    var Register = Machine.Processor.Register;
    var addr; // 값을 가져올 메모리의 주소 값입니다.
    
    // 대괄호를 제외한 문자열을 획득하고, 이를 이용해 버퍼를 생성합니다.
    var buffer = new StringBuffer(param.slice(1, param.length-1));
    
    // 가장 앞은 언제나 레지스터입니다.
    var reg = buffer.get_token();
    
    // 획득한 레지스터가 보관하고 있는 값을 획득합니다.
    var regval = Register.get(reg);
    
    // 다음 토큰을 획득합니다.
    var op = buffer.get_token();
    if (op == null) { // 다음 토큰이 존재하지 않는다면 [reg] 형식입니다.
      addr = regval;
    }
    else if (op == '+') {
      var imm = parseInt(buffer.get_token());
      addr = regval + imm;
    }
    else if (op == '-') {
      var imm = parseInt(buffer.get_token());
      addr = regval - imm;
    }
    else
      throw new MemoryException("invalid memory token");
    
    // 획득한 위치를 반환합니다.
    return addr;
  }
  
  // 싱글톤에 속성 등록
  memory.read_byte = read_byte;
  memory.write_byte = write_byte;
  memory.get_byte = get_byte;
  memory.set_byte = set_byte;
  memory.read_word = read_word;
  memory.write_word = write_word;
  memory.get_word = get_word;
  memory.set_word = set_word;
  memory.read_dword = read_dword;
  memory.write_dword = write_dword;
  memory.get_dword = get_dword;
  memory.set_dword = set_dword;
  
  memory.MaxSize = GetMaxMemorySize;
  memory.show = show;
  
  memory.is_memory = is_memory;
  memory.get_memory_value = get_memory_value;
  memory.set_memory_value = set_memory_value;
  
  memory.get_memory_address = get_memory_address;
  
  // 전역에 싱글톤 등록
  window.MemoryException = MemoryException;
  machine.Memory = memory;
}