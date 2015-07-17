/**
Low Level Assembly를 해석하고 실행하는 프로세서입니다.
*/
function initMachineProcessor(machine) {
  var processor = {};
  
  // 프로세서에 레지스터 모듈을 등록합니다.
  initMachineProcessorRegister(processor);
  
  // 예외 처리 형식 작성
  /**
  Processor 모듈의 메서드를 수행할 때 발생하는 예외를 정의합니다.
  @param {string} msg
  */
  function ProcessorException(msg, data) {
    this.description = msg;
    this.data = data;
  }
  ProcessorException.prototype = new Exception();
  ProcessorException.prototype.toString = function() {
    return 'Processor' + Exception.prototype.toString.call(this);
  };
  
  // 메서드 정의
  /**
  식 스트림에 문자열을 출력하고 개행합니다.
  @param {string} param
  */
  function exp_writeln(param) {
    Program.Stream.exp.writeln(param);
  }
  /**
  레지스터 스트림에 현재 레지스터의 상태를 출력합니다.
  */
  function reg_writeln() {
    var Stream = Program.Stream;
    var Reg = Machine.Processor.Register;
    Stream.reg.writeln('eax = %08x, ebx = %08x, ecx = %08x, edx = %08x',
       Reg.get('eax'), Reg.get('ebx'), Reg.get('ecx'), Reg.get('edx'));
    Stream.reg.writeln('ebp = %04x, esp = %04x, eip = %08x, eflags = %08b',
       Reg.get('ebp'), Reg.get('esp'), Reg.get('eip'), Reg.get('eflags'));
  }
  
  /**
  메모리로부터 명령 코드를 가져와 문자열로 반환합니다.
  @return {string}
  */
  function fetch() {
    var Memory = Machine.Memory;
    var Register = Machine.Processor.Register;
    
    var opcode = ''; // 획득할 명령 코드를 보관합니다.
    var MEMORY_END = Memory.MaxSize() - 1; // 메모리의 끝입니다.
    
    // 메모리의 끝이 나타나기 전까지 분석합니다.
    while (Memory.bytePtr <= MEMORY_END) {
      // 현재 바이트 포인터가 가리키는 바이트를 획득합니다.
      var byte = Memory.read_byte();
      if (byte == 0) // 널을 획득했다면 명령 코드 획득을 끝냅니다.
        break;
      
      // 획득한 바이트 코드에 해당하는 문자를 덧붙입니다.
      opcode += String.fromCharCode(byte);
    }
    
    // 현재 메모리 바이트 포인터의 값을 eip 레지스터에 복사합니다.
    Register.set('eip', Memory.bytePtr);
    
    // 획득한 명령 코드를 반환합니다.
    return opcode;
  }
  
  /**
  코드를 분석합니다.
  @param {string} line
  @return {InstructionInfo}
  */
  function decode(line) {
    // StringBuffer 객체를 생성하고 line으로 초기화합니다.
    var buffer = new StringBuffer(line);
    
    // 가장 처음에 획득하는 단어는 반드시 니모닉입니다.
    var mne = buffer.get_token();
    // 니모닉 획득에 실패한 경우 예외 처리합니다.
    if (is_fnamch(mne) == false)
      throw new ProcessorException('invalid mnemonic');
    
    // 다음 토큰 획득을 시도합니다.
    var left = buffer.get_token();
    
    var right = null;
    if (left != null) { // 다음 토큰이 있는 경우의 처리
      // 피연산자가 두 개인지 확인하기 위해 토큰 획득을 시도합니다.
      right = buffer.get_token();
      
      if (right != null) { // 다음 토큰이 있는 경우
        if (right != ',') // 반점이 아니라면 HASM 문법 위반입니다.
          throw new ProcessorException
            ('syntax error; right operand must be after comma(,)');
        
        // 오른쪽 피연산자 획득
        right = buffer.get_token();
        if (right == null) // 획득 실패 시 문법을 위반한 것으로 간주합니다.
          throw new ProcessorException
            ('syntax error; cannot find right operand');
      }
      
      // 다음 토큰이 없다면 right는 null이고
      // 그렇지 않으면 다음 토큰 문자열이 된다
    }
    
    // 획득한 코드 정보를 담는 객체를 생성하고 반환합니다.
    var info = { mnemonic: mne, left: left, right: right };
    return info;
  }
  
  /**
  분석된 코드를 실행합니다.
  @param {InstructionInfo}
  */
  function execute(info) {
    Machine.Operate[info.mnemonic](info.left, info.right);
  }
  
  /**
  명령 포인터를 주소로 옮깁니다.
  @param {number} addr
  */
  function setip(addr) {
    Machine.Processor.Register.set('eip', addr);
    Machine.Memory.bytePtr = addr;
  }
  
  /**
  진입점을 기준으로 프로그램을 실행합니다.
  */
  function run() {
    var Memory = Machine.Memory;
    var Runner = Program.Runner;
    var Stream = Program.Stream;
    var Register = Machine.Processor.Register;
    
    // 코드 영역의 시작 지점으로 바이트 포인터를 옮깁니다.
    var MEMORY_END = Memory.MaxSize();
    Register.set('ebp', MEMORY_END);
    Register.set('esp', MEMORY_END);
    setip(Runner.entrypoint);
    
    while (true) {
      // 스트림을 비웁니다.
      Stream.reg.clear();
      Stream.exp.clear();
      Stream.mem.clear();
      
      // 메모리로부터 명령 코드를 획득합니다.
      var opcode = fetch();
      if (opcode == 'exit') // 명령 코드가 exit이면 프로그램을 종료합니다.
        break;
      
      // fetch를 통해 가져온 정보를 분석합니다.
      var info = decode(opcode);

      // decode를 통해 분석된 정보를 바탕으로 명령을 실행합니다.
      execute(info);

      // 식을 분석하고 실행한 결과를 스트림에 출력합니다.
      exp_writeln(opcode);
      reg_writeln();
      Memory.show();
      
      // 각 단계에 맞는 문자열을 보관합니다.
      var status = {
        reg: document.getElementById(Stream.reg.streamName).value,
        exp: document.getElementById(Stream.exp.streamName).value,
        mem: document.getElementById(Stream.mem.streamName).value
      };
      Program.status.push(status);
    }
    log('run complete');
  }
  
  // 등록
  processor.run = run;
  
  window.ProcessorException = ProcessorException;
  machine.Processor = processor;
}

function initMachineProcessorRegister(processor) {
  // Register 모듈을 정의합니다.
  var register = {};
  
  // 실제 레지스터를 보관하는 reg 객체입니다.
  var _reg = {
    eax: 0, ebx: 0, ecx: 0, edx: 0,
    ebp: 0, esp: 0, eip: 0, eflags: 0,
    ds: 0, cs: 0, ss: 0, es: 0
  }

  // 32비트 레지스터 목록입니다.
  var _reg32 = {
    eax: true, ebx: true, ecx: true, edx: true,
    ebp: true, esp: true, eip: true, eflags: true
  };
  // 16비트 레지스터 목록입니다.
  var _reg16 = {
    ax: true, bx: true, cx: true, dx: true,
    ds: true, ss: true, cs: true, es: true
  };
  // 8비트 레지스터 목록입니다.
  var _reg8 = {
    ah: true, al: true, bh: true, bl: true,
    ch: true, cl: true, dh: true, dl: true
  };
  
  /**
  주어진 인자가 레지스터라면 true를, 아니면 false를 반환합니다.
  @param {string} param
  @return {boolean}
  */
  function is_register(param) {
    return (is_reg32(param) || is_reg16(param) || is_reg8(param));
  }
  /**
  주어진 인자가 32비트 레지스터라면 true를, 아니면 false를 반환합니다.
  @param {string} param
  @return {boolean}
  */
  function is_reg32(param) {
    return Machine.Processor.Register._reg32[param] ? true : false;
  }
  /**
  주어진 인자가 16비트 레지스터라면 true를, 아니면 false를 반환합니다.
  @param {string} param
  @return {boolean}
  */
  function is_reg16(param) {
    return Machine.Processor.Register._reg16[param] ? true : false;
  }
  /**
  주어진 인자가 8비트 레지스터라면 true를, 아니면 false를 반환합니다.
  @param {string} param
  @return {boolean}
  */
  function is_reg8(param) {
    return Machine.Processor.Register._reg8[param] ? true : false;
  }
  
  /**
  레지스터의 값을 획득하여 4바이트 정수로 반환합니다.
  @param {string} regName
  @return {number}
  */
  function get(regName) {
    return Machine.Processor.Register._reg[regName];
  }
  /**
  레지스터의 값을 4바이트 정수로 설정합니다.
  @param {string} regName
  @param {number} value
  */
  function set(regName, value) {
    Machine.Processor.Register._reg[regName] = value;
  }
  
  // 플래그 레지스터에 대한 처리 메서드입니다.
  const BIT_CF = 1,
        BIT_PF = 1 << 2,
        BIT_AF = 1 << 4,
        BIT_ZF = 1 << 6,
        BIT_SF = 1 << 7,
        BIT_OF = 1 << 11;
  function getCF() { return (this.get('eflags') & BIT_CF) ? 1 : 0 };
  function setCF(value) {
    if (value == 0) { // 0으로 설정
      this.set('eflags', this.get('eflags') & (~BIT_CF));
    } else { // 1로 설정
      this.set('eflags', this.get('eflags') | BIT_CF);
    }
  }
  function getPF() { return (this.get('eflags') & BIT_PF) ? 1 : 0 };
  function setPF(value) {
    if (value == 0) { // 0으로 설정
//      this.eflags &= (~BIT_PF);
      this.set('eflags', this.get('eflags') & (~BIT_PF));
    } else { // 1로 설정
//      this.eflags |= BIT_PF;
      this.set('eflags', this.get('eflags') | BIT_PF);
    }
  }
  function getAF() { return (this.get('eflags') & BIT_AF) ? 1 : 0 };
  function setAF(value) {
    if (value == 0) { // 0으로 설정
      this.set('eflags', this.get('eflags') & (~BIT_AF));
    } else { // 1로 설정
      this.set('eflags', this.get('eflags') | BIT_AF);
    }
  }
  function getZF() { return (this.get('eflags') & BIT_ZF) ? 1 : 0 };
  function setZF(value) {
    if (value == 0) { // 0으로 설정
      this.set('eflags', this.get('eflags') & (~BIT_ZF));
    } else { // 1로 설정
      this.set('eflags', this.get('eflags') | BIT_ZF);
    }
  }
  function getSF() { return (this.get('eflags') & BIT_SF) ? 1 : 0 };
  function setSF(value) {
    if (value == 0) { // 0으로 설정
      this.set('eflags', this.get('eflags') & (~BIT_SF));
    } else { // 1로 설정
      this.set('eflags', this.get('eflags') | BIT_SF);
    }
  }
  function getOF() { return (this.get('eflags') & BIT_OF) ? 1 : 0 };
  function setOF(value) {
    if (value == 0) { // 0으로 설정
      this.set('eflags', this.get('eflags') & (~BIT_OF));
    } else { // 1로 설정
      this.set('eflags', this.get('eflags') | BIT_OF);
    }
  }
  
  // 등록
  register._reg = _reg;
  register._reg32 = _reg32;
  register._reg16 = _reg16;
  register._reg8 = _reg8;
  
  register.is_register = is_register;
  register.is_reg32 = is_reg32;
  register.is_reg16 = is_reg16;
  register.is_reg8 = is_reg8;
  
  register.get = get;
  register.set = set;

  register.getCF = getCF;
  register.setCF = setCF;
  register.getPF = getPF;
  register.setPF = setPF;
  register.getAF = getAF;
  register.setAF = setAF;
  register.getZF = getZF;
  register.setZF = setZF;
  register.getSF = getSF;
  register.setSF = setSF;
  register.getOF = getOF;
  register.setOF = setOF;  

  processor.Register = register;
}