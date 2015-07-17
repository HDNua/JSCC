/**
Machine에 프로그램 실행을 요청합니다.
*/
function initProgramRunner(program) {
  var runner = {};
  
  // 속성 정의 이전에 정의해야 하는 내용 작성
  /**
  Runner 모듈의 메서드를 수행할 때 발생하는 예외를 정의합니다.
  @param {string} msg
  */
  function RunnerException(msg, data) {
    this.description = msg;
    this.data = data;
  }
  RunnerException.prototype = new Exception();
  RunnerException.prototype.toString = function() {
    return 'Runner' + Exception.prototype.toString.call(this);
  };

  /**
  레이블 정보를 표현하는 형식 LabelInfo를 정의합니다.
  @param {string} segmentName
  @param {string} name
  */
  function LabelInfo(segmentName, name) {
    this.segmentName = segmentName;
    this.name = name;
    this.offset = 0;
    this.refered = [];
  }
  /**
  인자가 레이블 이름인지 판정합니다.
  @param {string} param
  @return {boolean}
  */
  function is_label_name(param) {
    return (param.charAt(0) == '_');
  }
  
  /**
  데이터 타입의 크기를 반환합니다. db이면 1을 반환하는 식입니다.
  @param {string} datatype
  @return {number}
  */
  function getDataTypeSize(datatype) {
    switch (datatype.toLowerCase()) { // 소문자 문자열로 변경하고 확인합니다.
      case 'db':
      case 'byte':
        return 1;
      case 'dw':
      case 'word':
        return 2;
      case 'dd':
      case 'dword':
        return 4;
    }
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
      throw new RunnerException('invalid mnemonic');
    
    // 다음 토큰 획득을 시도합니다.
    var left = buffer.get_token();
    
    var right = null;
    if (left != null) { // 다음 토큰이 있는 경우의 처리
      // 피연산자가 두 개인지 확인하기 위해 토큰 획득을 시도합니다.
      right = buffer.get_token();
      
      if (right != null) { // 다음 토큰이 있는 경우
        if (right != ',') // 반점이 아니라면 HASM 문법 위반입니다.
          throw new RunnerException
            ('syntax error; right operand must be after comma(,)');
        
        // 오른쪽 피연산자 획득
        right = buffer.get_token();
        if (right == null) // 획득 실패 시 문법을 위반한 것으로 간주합니다.
          throw new RunnerException
            ('syntax error; cannot find right operand');
      }
      
      // 다음 토큰이 없다면 right는 null이고
      // 그렇지 않으면 다음 토큰 문자열이 된다
    }
    
    // 획득한 코드 정보를 담는 객체를 생성하고 반환합니다.
    var info = { mnemonic: mne, left: left, right: right };
    return info;
  }
  
  // 필드 및 메서드 정의
  runner.imageBase = 4;
  runner.baseOfData = 0;
  runner.sizeOfData = 0;
  runner.baseOfCode = 0;
  runner.sizeOfCode = 0;
  runner.entrypoint = 0;
  
  /**
  지정한 파일을 불러와 메모리에 올립니다.
  @param {string} filename
  */
  function load(filename) {
    var Memory = Machine.Memory;
    
    // 파일로부터 텍스트를 획득합니다.
    var code = HandyFileSystem.load(filename);
    if (code == null) // 텍스트를 획득하지 못한 경우 예외를 발생합니다.
      throw new RunnerException('Cannot load file', filename);

    // 획득한 텍스트를 줄 단위로 나눈 배열을 획득합니다.
    var lines = String(code).split(NEWLINE);

    // 코드를 메모리에 기록하기 위해 바이트 포인터를 맞춥니다.
    Memory.bytePtr = 4;

    // 획득한 텍스트를 메모리에 기록합니다.
    var labelInfoDict = {}; // LabelInfo에 대한 딕셔너리 객체입니다.
    
    // 각각의 세그먼트에 들어갈 정보를 리스트 식으로 관리합니다.
    var segment = { data: [], code: [] }; // 순서대로 데이터나 코드를 추가합니다.
    var segment_target = null; // 현재 분석중인 세그먼트입니다.
    
    var baseOfData = 0; // 데이터 세그먼트의 시작 지점입니다.
    var sizeOfData = 0; // 데이터 세그먼트의 전체 크기입니다.
    var baseOfCode = 0; // 코드 세그먼트의 시작 지점입니다.
    var sizeOfCode = 0; // 코드 세그먼트의 전체 크기입니다.
    
    for (var i=0, len=lines.length; i<len; ++i) {
      try {
        // i번째 줄에서 양 옆 공백이 제거된 문자열을 가져옵니다.
        var line = lines[i].trim();

        // 지시어 및 예외적 상황을 처리합니다.
        if (line == '') continue; // 빈 줄은 넘어갑니다.
        else if (line.charAt(0) == ';') continue; // 주석은 넘어갑니다.
        else if (line.charAt(0) == '.') { // 세그먼트를 처리합니다.
          // 세그먼트 정보를 보관합니다.
          // 이후에 나타나는 코드의 영역을 결정하기 위해 사용합니다.
          segment_target = line.slice(1);
          continue;
        }
        
        // 세그먼트에 정의되는 정보를 처리합니다.
        if (segment_target == null) // 세그먼트가 정의되지 않았다면 예외 처리합니다.
          throw new RunnerException("segment is null");
        // 데이터 세그먼트를 처리합니다.
        else if (segment_target == 'data') {
          var label = null, type, value;
          
          // 줄에 대한 버퍼를 생성합니다.
          var buffer = new StringBuffer(line);
          
          // 첫 단어를 획득해봅니다.
          var token = buffer.get_token();
          if (is_label_name(token)) { // 획득한 토큰이 레이블이라면
            label = token; // 토큰은 레이블의 이름이 됩니다.
            
            // 획득한 레이블 이름을 바탕으로 레이블 정보 객체를 생성합니다.
            var labelInfo = new LabelInfo(segment_target, label);
            
            // 레이블의 주소는 세그먼트 시작점 + 현재까지 획득한 데이터 크기입니다.
            // 따라서 오프셋은 현재까지 획득한 데이터 크기가 됩니다.
            labelInfo.offset = sizeOfData;
            
            // 생성한 정보를 딕셔너리에 등록합니다.
            labelInfoDict[label] = labelInfo;
            
            token = buffer.get_token(); // 다음 토큰인 형식을 획득합니다.
          }
          type = token; // 형식을 보관합니다.
          
          // 값은 토큰 배열로 보관합니다.
          var tokenArray = []; // 값을 보관할 토큰 배열입니다.
          var dataCount = 0; // 데이터 세그먼트에 올라갈 값의 개수입니다.
          do {
            // token, token, token, ..., token 형식의 문장을 분석합니다.
            token = buffer.get_token(); // 토큰을 획득합니다.
            if (token == null) // 획득에 실패하면 더 획득할 토큰이 없는 것입니다.
              break;
            
            tokenArray.push(token); // 획득한 토큰을 토큰 배열에 넣습니다.
            
            // 정수가 아니라면 문자열로 간주하고 따옴표를 제거한 크기를 더합니다.
            // 토큰의 길이는 곧 토큰 요소의 수입니다.
            if (is_digit(token.charAt(0)) == false)
              dataCount += token.length - 2;
            else
              dataCount += token.length;
            
            token = buffer.get_token(); // 다시 토큰을 획득하여 반점인지 확인합니다.
            if (token == null) // 다음 토큰이 없다면
              break;
            else if (token != ',') // 다음 토큰이 반점이 아니라면 예외 처리합니다.
              throw new RunnerException
                ('load: value in data segment must be separated with comma');
            
            // 마지막에 반점이 있으나 없으나 상관없습니다.
          } while (buffer.is_empty() == false);
          value = tokenArray; // 값을 토큰 배열로 맞춥니다.
          
          // 전체 데이터의 크기에 추가한 토큰의 크기를 더합니다.
          var typeSize = getDataTypeSize(type); // 토큰 요소 각각의 크기입니다.
          
          // 토큰 크기 = 토큰 요소 크기 * 토큰 요소 개수
          sizeOfData += typeSize * dataCount;
          
          // 데이터 세그먼트에 형식과 값을 저장하는 객체를 보관합니다.
          segment.data.push({ typeSize:typeSize, value:value });
        }
        // 코드 세그먼트를 처리합니다.
        else if (segment_target == 'code') {
          
          // 레이블에 대해 처리합니다.
          if (line.charAt(line.length-1) == ':') {
            // 레이블 이름을 획득합니다.
            var label = line.substr(0, line.length-1);

            // 레이블이 딕셔너리에 없는 경우 생성합니다.
            if (labelInfoDict[label] == undefined)
              labelInfoDict[label] = new LabelInfo(segment_target, label);

            // 레이블 딕셔너리에 정보를 등록합니다.
            labelInfoDict[label].offset = sizeOfCode;
            continue;
          }

          // 논리가 복잡해졌으므로 획득한 행을 분석합니다.
          var info = decode(line);

          // 메모리에 기록할 문자열을 생성합니다.
          var s = info.mnemonic; // 맨 처음은 니모닉입니다.
          if (info.left != null) { // 인자가 존재한다면
            s += ' '; // 분석할 수 있도록 니모닉과 간격을 만듭니다.

            // 레이블이라면 (맨 앞이 밑줄 기호라면)
            if (info.left.charAt(0) == '_') {

              // 참조 위치는 (현재 바이트 포인터 위치 + 니모닉의 길이 + 공백 한 칸)입니다.
              var refered_addr = sizeOfCode + s.length;
              s += '0x0000'; // 일단 0으로 대치합니다.

              var label = info.left; // 레이블 이름을 획득합니다.
              // 레이블이 딕셔너리에 등록되지 않았다면 등록합니다.
              if (labelInfoDict[label] == undefined)
                labelInfoDict[label] = new LabelInfo(segment_target, label);

              // 참조하고 있는 위치를 보관합니다.
              labelInfoDict[label].refered.push(refered_addr);
            }
            // 레이블이 아니라면 그냥 피연산자로 취급합니다.
            else {
              s += info.left;
            }

            if (info.right != null) {
              s += ',';

              // 레이블이라면 (맨 앞이 밑줄 기호라면)
              if (info.right.charAt(0) == '_') {

                // 참조 위치는 (현재 바이트 포인터 위치 + 니모닉의 길이 + 공백 한 칸)입니다.
                var refered_addr = sizeOfCode + s.length;
                s += '0x0000'; // 일단 0으로 대치합니다.

                var label = info.right; // 레이블 이름을 획득합니다.
                // 레이블이 딕셔너리에 등록되지 않았다면 등록합니다.
                if (labelInfoDict[label] == undefined)
                  labelInfoDict[label] = new LabelInfo(segment_target, label);

                // 참조하고 있는 위치를 보관합니다.
                labelInfoDict[label].refered.push(refered_addr);
              }
              // 레이블이 아니라면 그냥 피연산자로 취급합니다.
              else {
                s += info.right;
              }
            }
          } // 인자가 존재하는 경우의 s 처리 종료
          
          // 획득한 줄 텍스트를 보관합니다.
          segment[segment_target].push(s);
          // 널 문자까지 세서 현재까지 획득한 코드 길이를 구합니다.
          sizeOfCode += (s.length + 1);
          
        } // 코드 세그먼트 처리 종료
        
      } catch (ex) {
        if (ex instanceof RunnerException) {
          log('Runner.load: ');
          log(i + ': [' + lines[i] + '] ' + ex.description);
        }
        else {
          throw ex;
        }
      }
    }
    
    // 데이터 세그먼트를 메모리에 올립니다.
    for (var i=0, dataCount=segment.data.length; i<dataCount; ++i) {
      // 데이터 세그먼트에는 {typeSize, value} 형식으로 저장했습니다.
      var dataInfo = segment.data[i];
      if (dataInfo == null) {
        continue;
      }
      
      // 저장한 정보를 바탕으로 메모리에 올립니다.
      var dataTypeSize = dataInfo.typeSize;
      var writeMethod = null; // 메모리에 값을 기록하는 방법을 결정합니다.
      switch (dataTypeSize) { // 데이터 형식의 크기를 기준으로
        case 1: writeMethod = 'write_byte'; break;
        case 2: writeMethod = 'write_word'; break;
        case 4: writeMethod = 'write_dword'; break;
        default: throw new RunnerException("invalid data typw size");
      }
      
      var tokenArray = dataInfo.value; // 토큰을 메모리에 기록합니다.
      for (var j=0, tokenCount=tokenArray.length; j<tokenCount; ++j) {
        var token = tokenArray[j];
        
        // 숫자라면 정수로 변환한 다음 이를 기록합니다.
        if (is_digit(token.charAt(0))) {
          var value = parseInt(token);
          Memory[writeMethod](value);
        }
        // 문자열이라면 각각의 요소에 대해 반복문을 실행합니다.
        else {
          for (var k=1, len=token.length-1; k<len; ++k) {
            var value = token.charCodeAt(k);
            Memory[writeMethod](value);
          }
        }
      } // 토큰 기록 종료
    }
    // 코드 세그먼트를 메모리에 올립니다.
    for (var i=0, codeCount=segment.code.length; i<codeCount; ++i) {
      var line = segment.code[i];
      for (var j=0, len=line.length; j<len; ++j)
        Memory.write_byte(line.charCodeAt(j));
      Memory.write_byte(0);
    }
    
    // 모든 참조된 레이블을 정의로 대치합니다.
    baseOfData = runner.imageBase;
    baseOfCode = baseOfData + sizeOfData; // 코드 세그먼트의 시작점을 획득합니다.
    for (label in labelInfoDict) {
      var info = labelInfoDict[label]; // LabelInfo 정보를 가져옵니다.
      var base = (info.segmentName == 'data') ? baseOfData : baseOfCode;
      
      // 참조된 레이블을 정의로 대치합니다.
      var arr = info.refered;
      for (var i=0, len=arr.length; i<len; ++i) {
        // 대치해야 할 메모리 위치로 바이트 포인터를 이동합니다.
        Memory.bytePtr = baseOfCode + arr[i];
        
        // 참조된 레이블의 정의를 16진수 문자열로 획득합니다.
        var address = base + info.offset;
        var refered_addr = Handy.format('0x%04x', address);
        
        // 해당 참조 위치에 정의 값을 덮어씌웁니다.
        for (var j=0, slen=refered_addr.length; j<slen; ++j)
          Memory.write_byte(refered_addr.charCodeAt(j));
      }
    }
    
    // 진입점을 지정합니다.
    runner.entrypoint = Memory.bytePtr -= (15 + NEWLINE.length);
    
    runner.baseOfData = baseOfData;
    runner.sizeOfData = sizeOfData;
    runner.baseOfCode = baseOfCode;
    runner.sizeOfCode = sizeOfCode;
    log('load complete');
  }
  function run() {
    Machine.Processor.run();
  }
  
  // 등록
  runner.load = load;
  runner.run = run;
  program.Runner = runner;
}