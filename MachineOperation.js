/**
프로세서의 행동이 정의된 보조 모듈입니다.
*/
function initMachineOperation(machine) {
  var operate = {};
  
  /**
  근원지로부터 값을 가져옵니다.
  @param {string} src
  @return {number}
  */
  function get_value(src) {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    
    var value = null;
    if (Register.is_register(src)) { // 레지스터라면
      value = Register.get(src); // 레지스터의 값을 획득합니다.
    }
    else if (Memory.is_memory(src)) { // 메모리라면
      value = Memory.get_memory_value(src); // 메모리의 값을 획득합니다.
    }
    else { // 레지스터가 아니라면 정수로 간주하고, 정수로 변환한 값을 획득합니다.
      value = parseInt(src);
    }
    return value; // 획득한 값을 반환합니다.
  }
  /**
  목적지에 맞게 값을 설정합니다.
  @param {string} dst
  @param {number} src
  */
  function set_value(dst, src) {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    
    if (Register.is_register(dst)) { // 목적지가 레지스터라면
      Register.set(dst, src); // 레지스터에 값을 기록합니다.
    }
    else if (Memory.is_memory(dst)) { // 목적지가 메모리라면
      Memory.set_memory_value(dst, src); // 메모리에 값을 기록합니다.
    }
    else { // 그 외의 경우 예외 처리합니다.
      throw new ProcessorException('invalid left value');
    }
  }
  
  function mov(left, right) {
    // right의 값을 획득하고 left에 기록합니다.
    set_value(left, get_value(right));
  }
  function jmp(left) {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    var dest_addr = 0; // 점프할 목적지입니다.

    // 레지스터라면 해당 레지스터의 값으로 점프합니다.
    if (Register.is_register(left))
      dest_addr = Register.get(left); // Register[left];
    // 정수라면 해당 정수 값으로 점프합니다.
    else
      dest_addr = parseInt(left, 16);

    // 획득한 목적지로 바이트 포인터를 옮깁니다.
    Memory.bytePtr = dest_addr;
  }
  function push(left) {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    
    // esp의 값이 4만큼 줄었다.
    Register.set('esp', Register.get('esp') - 4); // Register.esp -= 4;
    
    var value;
    if (Register.is_register(left)) // 레지스터라면 레지스터의 값을 획득합니다.
      value = Register.get(left); // Register[left];
    else  // 레지스터가 아니라면 정수로 간주하고 값을 획득합니다.
      value = parseInt(left);

    // esp가 가리키는 위치의 메모리에서 4바이트만큼을 ebp로 채웠다.
    Memory.set_dword(value, Register.get('esp'));
  }
  function pop(left) {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    // esp가 가리키는 메모리의 dword 값을 획득합니다.
    var popVal = Memory.get_dword(Register.get('esp'));

    // esp를 레지스터 크기만큼 증가시킵니다.
    Register.set('esp', Register.get('esp') + 4); // Register.esp += 4;

    // 목적지 레지스터에 획득한 값을 대입합니다.
    Register.set(left, popVal); // Register[left] = popVal;
  }
  
  function jnz(left) {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    // 0이 아니면, 즉 영 플래그가 1이 아니면 점프합니다.
    if (Register.getZF() != 1)
      jmp(left);
  }
  function cmp(left, right) {
    var Register = Machine.Processor.Register;
    var Reg = Register;
    var Memory = Machine.Memory;
    
    var lval = null, rval = null;
    var isLeftMem = false, isRightMem = false;
    
    // left의 값을 획득합니다.
    if (Register.is_register(left))
      lval = Reg.get(left);
    else if (Memory.is_memory(left)) {
      lval = Memory.get_memory_value(left);
      isLeftMem = true;
    }
    else
      lval = parseInt(left);

    // right의 값을 획득합니다.
    if (Register.is_register(right))
      rval = Reg.get(right);
    else if (Memory.is_memory(right)) {
      rval = Memory.get_memory_value(right);
      isRightMem = true;
    }
    else
      rval = parseInt(right);
    
    // 둘 다 메모리라면 문법 위반입니다.
    if (isLeftMem && isRightMem)
      throw new ProcessorException
        ("syntax error; cannot refer 2 memory address simultaneously");
    
    // 두 값이 같은지에 대한 결과를 반영합니다. 같다면 1, 아니면 0입니다.
    var value = (lval == rval) ? 1 : 0;
    Register.setZF(value);
  }
  
  function call(left) {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    push(Register.get('eip')); // 다음 명령의 위치를 푸시합니다.
    jmp(left); // 인자 값의 위치로 점프합니다.
  }
  function ret() {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    
    pop('eip'); // 복귀할 명령 주소를 팝합니다.
    Memory.bytePtr = Register.get('eip'); // 해당 주소로 명령 포인터를 맞춥니다.
  }
  function add(left, right) {
    // left의 값을 두 값의 합으로 갱신합니다.
    set_value(left, get_value(left) + get_value(right));
  }
  function sub(left, right) {
    // left의 값을 두 값의 차로 갱신합니다.
    set_value(left, get_value(left) - get_value(right));
  }
  
  // 메모리의 주소를 가져옵니다.
  function lea(left, right) {
    set_value(left, Machine.Memory.get_memory_address(right));
  }
  
  operate.mov = mov;
  operate.jmp = jmp;
  operate.push = push;
  operate.pop = pop;
  operate.jnz = jnz;
  operate.cmp = cmp;
  
  operate.call = call;
  operate.ret = ret;
  
  operate.add = add;
  operate.sub = sub;
  
  operate.lea = lea;
  
  // handy 특수 니모닉을 처리합니다.
  function handy(left, right) {
    var Register = Machine.Processor.Register;
    var Memory = Machine.Memory;
    var Stream = Program.Stream;
    
    if (left == 'print_number') {
      var value;

      // 레지스터라면 레지스터의 값을 얻는다.
      if (Register.is_register(right)) {
        value = Register.get(right); // Register[right];
      }
      // 레지스터가 아니라면 인자를 정수로 변환한다.
      else {
        value = parseInt(right);
      }

      // 획득한 값을 출력한다.
      Stream.out.write(value);
    }
    else if (left == 'print_letter') {
      var value;

      // 레지스터라면 레지스터의 값을 얻는다.
      if (Register.is_register(right)) {
        value = Register.get(right); // Register[right];
      }
      // 레지스터가 아니라면 인자를 정수로 변환한다.
      else {
        value = parseInt(right);
      }

      // 획득한 값으로부터 문자를 획득하고 이를 출력한다.
      Stream.out.write(String.fromCharCode(value));
    }
    else if (left == 'print_string') {
      Stream.out.write(right);
    }
    else if (left == 'puts') {
      var value = null;
      
      // 레지스터라면 레지스터 값 획득
      if (Register.is_register(right)) {
        value = Register.get(right); // Register[right];
      }
      // 메모리라면 메모리 값 획득
      else if (Memory.is_memory(right)) {
        value = Memory.get_memory_value(right);
      }
      // 모두 아니라면 즉시 값 획득
      else {
        value = parseInt(right);
      }
      
      // 현재 바이트 포인터는 보존합니다.
      var prevBytePtr = Memory.bytePtr;
      
      // 문자열을 출력할 위치로 바이트 포인터를 맞춥니다.
      Memory.bytePtr = value;
      
      // 널이 아닐 때까지 문자를 출력합니다.
      var s = '';
      while (true) {
        var byte = Memory.read_byte(); // 바이트를 획득합니다.
        if (byte == 0) // 널 문자가 나타났다면 종료합니다.
          break;
        s += String.fromCharCode(byte); // 바이트로부터 문자를 획득합니다.
      }
      
      // 획득한 문자열을 출력합니다.
      Stream.out.write(s);
      
      // 이전 바이트 포인터를 복구합니다.
      Memory.bytePtr = prevBytePtr;
    }
    else if (left == 'putn') {
      var value = null;
      
      // 레지스터라면 레지스터 값 획득
      if (Register.is_register(right)) {
        value = Register.get(right); // Register[right];
      }
      // 메모리라면 메모리 값 획득
      else if (Memory.is_memory(right)) {
        value = Memory.get_memory_value(right);
      }
      // 모두 아니라면 즉시 값 획득
      else {
        value = parseInt(right);
      }
      
      Stream.out.write(value);
    }
    else {
      
    }
  }
  operate.handy = handy;
  
  machine.Operate = operate;
}