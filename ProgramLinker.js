/**
실행 가능한 목적 파일을 생성합니다.
*/
function initProgramLinker(program) {
  var linker = {};
  
  // 속성 정의 이전에 정의해야 하는 내용 작성
  /**
  Linker 모듈의 메서드를 수행할 때 발생하는 예외를 정의합니다.
  @param {string} msg
  */
  function LinkerException(msg, data) {
    this.description = msg;
    this.data = data;
  }
  LinkerException.prototype = new Exception();
  LinkerException.prototype.toString = function() {
    return 'Linker' + Exception.prototype.toString.call(this);
  };

  /**
  목적 파일의 정보를 보관하는 객체 형식을 정의합니다.
  */
  function ObjectInfo(segment, labelInfoDict, sizeOfData, sizeOfCode) {
    this.segment = segment;
    this.labelInfoDict = labelInfoDict;
    this.sizeOfData = sizeOfData;
    this.sizeOfCode = sizeOfCode;
  }

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
  전역 레이블 정보를 표현하는 형식 GlobalLabelInfo를 정의합니다.
  @param {number} objectIndex
  @param {string} segmentName
  @param {string} name
  */
  function GlobalLabelInfo(objectIndex, segmentName, name) {
    this.segmentName = segmentName;
    this.name = name;
    this.index = objectIndex; // 레이블이 정의된 목적 파일의 인덱스를 보관합니다.
    this.offset = -1; // 목적 파일의 인덱스로부터 세그먼트의 시작 위치를 계산합니다.
    this.refered = []; // 이 레이블을 참조하는 목적 파일의 인덱스도 보관해야 합니다.
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
      throw new LinkerException('invalid mnemonic');
    
    // 다음 토큰 획득을 시도합니다.
    var left = buffer.get_token();
    
    var right = null;
    if (left != null) { // 다음 토큰이 있는 경우의 처리
      // 피연산자가 두 개인지 확인하기 위해 토큰 획득을 시도합니다.
      right = buffer.get_token();
      
      if (right != null) { // 다음 토큰이 있는 경우
        if (right != ',') { // 반점이 아니라면 HASM 문법 위반입니다.
          log('decode.mne/left/right: [%s/%s/%s]', mne, left, right);
          throw new LinkerException
            ('syntax error; right operand must be after comma(,)');
        }
        
        // 오른쪽 피연산자 획득
        right = buffer.get_token();
        if (right == null) // 획득 실패 시 문법을 위반한 것으로 간주합니다.
          throw new LinkerException
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
  전역 레이블이라면 true, 아니면 false입니다.
  @param {string} label
  @return {boolean}
  */
  function is_public(label) {
    return (Program.Linker.GlobalLabelDict[label] != undefined);
  }
  
  /**
  테스트 메서드입니다.
  */
  function test(filename) {
    var Linker = Program.Linker;
    var objectList = Linker.ObjectInfoList;
    
    for (var j=0, objectCount=objectList.length; j<objectCount; ++j) {
      var objectInfo = objectList[j]; // 목적 파일 정보를 획득합니다.
      log('objectInfo %d: ', j);

      // ObjectInfo 객체의 정보를 문자열로 반환하기 위해
      // 문자열 스트림을 생성합니다.
      var ss = new Program.Stream.StringStream(); 
      // 레이블 정보를 출력합니다.
      ss.writeln('> local labels');
      for (label in objectInfo.labelInfoDict) {
        var info = objectInfo.labelInfoDict[label];
        ss.write('%s %s: %04x [ ', info.segmentName, info.name, info.offset);
        for (var i=0, len=info.refered.length; i<len; ++i) {
          ss.write('%04x ', info.refered[i]);
        }
        ss.writeln(']');
      }
      // 데이터 세그먼트의 정보를 출력합니다.
      var sizeOfData = objectInfo.sizeOfData,
          sizeOfCode = objectInfo.sizeOfCode;
      ss.writeln('> data segment [%d(%04x)]', sizeOfData, sizeOfData);
      for (var i=0, len=objectInfo.segment.data.length; i<len; ++i) {
        var data = objectInfo.segment.data[i];
        ss.writeln('%d: %d, [%04x]', i, data.typeSize, data.value);
      }
      // 코드 세그먼트의 정보를 출력합니다.
      ss.writeln('> code segment [%d(%04x)]', sizeOfCode, sizeOfCode);
      for (var i=0, len=objectInfo.segment.code.length; i<len; ++i) {
        var code = objectInfo.segment.code[i];
        ss.writeln('%s', code);
      }
      // 목적 파일 정보 문자열을 로그 스트림에 출력합니다.
      log(ss.str);
    }
    
    // 전역 레이블 정보를 출력합니다.
    log('===== global labels =====');
    var globalList = Linker.GlobalLabelDict;
    for (label in globalList) {
      var info = globalList[label];
      // 문자열 스트림을 생성합니다.
      var ss = new Program.Stream.StringStream(); 
      ss.write('%s %s: [%d] %04x [ ',
               info.segmentName, info.name, info.index, info.offset);
      for (var i=0, len=info.refered.length; i<len; ++i) {
        var refered = info.refered[i];
        ss.write('[%d:%04x] ', refered.objectIndex, refered.offset);
      }
      ss.write(']');
      log(ss.str);
    }
    
    log('link complete');
  }
  
  // 필드 정의
  linker.entrypoint = null;
  linker.baseOfData = 0;
  linker.sizeOfData = 0;
  linker.baseOfCode = 0;
  linker.sizeOfCode = 0;
  linker.ObjectInfoList = []; // ObjectInfo 객체에 대한 리스트입니다.
  linker.GlobalLabelDict = {}; // 전역 레이블 객체에 대한 딕셔너리입니다.
  
  linker.imageBase = 4; // 메모리에 올라갈 바이트 배열의 시작점입니다.
  
  // 메서드 정의
  /**
  파일 시스템으로부터 목적 파일을 불러옵니다.
  @param {string} filename
  */
  function load(filename) {
    var Linker = Program.Linker;

    // 현재 목적 파일의 위치를 획득합니다.
    // 리스트의 가장 마지막에 추가할 원소이므로
    // 아직 원소가 추가되지 않았을 때의 리스트의 길이와 같습니다.
    var objectIndex = Linker.ObjectInfoList.length;

    // 파일로부터 텍스트를 획득합니다.
    var code = HandyFileSystem.load(filename);
    if (code == null) // 텍스트를 획득하지 못한 경우 예외를 발생합니다.
      throw new LinkerException('Cannot load file', filename);
    
    // 획득한 텍스트를 메모리에 기록합니다.
    var labelInfoDict = {}; // LabelInfo에 대한 딕셔너리 객체입니다.
    // 각각의 세그먼트에 들어갈 정보를 리스트 식으로 관리합니다.
    var segment = { data: [], code: [] }; // 순서대로 데이터나 코드를 추가합니다.
    var segment_target = null; // 현재 분석중인 세그먼트입니다.
    var baseOfData = 0; // 데이터 세그먼트의 시작 지점입니다.
    var sizeOfData = 0; // 데이터 세그먼트의 전체 크기입니다.
    var baseOfCode = 0; // 코드 세그먼트의 시작 지점입니다.
    var sizeOfCode = 0; // 코드 세그먼트의 전체 크기입니다.
    
    // extern 레이블에 대한 정보를 보관합니다.
    var externLabelDict = {}; // 목적 파일 별로 다르기 때문에 매번 새로 생성합니다.
    function is_external(label) {
      return (externLabelDict[label] != undefined) ? true : false;
    }
    // global 레이블에 대한 정보를 보관합니다.
    var globalLabelDict = {};
    function is_global(label) {
      return (globalLabelDict[label] != undefined) ? true : false;
    }
    
    // 획득한 텍스트를 줄 단위로 나눈 배열을 획득합니다.
    var lines = String(code).split(NEWLINE);
    for (var i=0, lineCount=lines.length; i<lineCount; ++i) {
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
        
        if (segment_target == null) // 세그먼트가 정의되지 않았다면 예외 처리합니다.
          throw new LinkerException("segment is null");
        
        // 행을 분석하기 위해 문자열 버퍼를 생성합니다.
        var lineBuffer = new StringBuffer(line);
        var lineToken = lineBuffer.get_token(); // 첫 번째 토큰을 획득합니다.
        if (lineToken == 'global') { // 전역 레이블을 지정하는 구문이라면
          label = lineBuffer.get_token(); // 레이블을 획득합니다.

          // 레이블 획득에 실패하면 예외 처리합니다.
          if (label == null)
            throw new LinkerException('directive global got empty param');
          else if (is_label_name(label) == false)
            throw new LinkerException('directive global got invalid param', label);

          // 전역 레이블 딕셔너리에 레이블 정보를 추가합니다.
          // 지역 레이블 딕셔너리에 이미 정보가 있다면
          if (labelInfoDict[label] != null) {
            // 전역 레이블 딕셔너리에 추가할 객체를 생성하고 기존 정보를 복사합니다.
            var gLabelInfo = new GlobalLabelInfo
              (objectIndex, segment_target, label);
            gLabelInfo.offset = labelInfoDict[label].offset;
            
            // 기존에 존재하던 참조 위치를 GlobalLabelInfo에 맞게 변환합니다.
            // 참조 위치에 목적 파일의 인덱스를 멤버로 추가하는 식으로 변환합니다.
            var ref = labelInfoDict[label].refered;
            for (var j=0, refCount=ref.length; j<refCount; ++j) {
              gLabelInfo.refered.push({ objectIndex:objectIndex, offset:ref[j]});
            }

            // 전역 레이블 딕셔너리로 옮깁니다.
            globalLabelDict[label] = gLabelInfo;
            
            // 더 이상 지역 레이블이 아니므로 딕셔너리에서 제거합니다.
            labelInfoDict[label] = null;
          }
          else if (is_global(label) == false) {
            // 딕셔너리에 이미 정보가 있다면 새로 생성할 필요가 없습니다.
            globalLabelDict[label] = new GlobalLabelInfo
              (objectIndex, segment_target, label);
          }
          continue; // 전역 레이블 지정자에 대한 처리를 종료합니다.
        }
        else if (lineToken == 'extern') { // 레이블이 외부에 있음을 알리는 구문이라면
          label = lineBuffer.get_token(); // 레이블을 획득합니다.

          // 레이블 획득에 실패하면 예외 처리합니다.
          if (label == null)
            throw new LinkerException('directive extern got empty param');
          else if (is_label_name(label) == false)
            throw new LinkerException('directive extern got invalid param', label);
          
          // 등록된 외부 레이블이 아니라면 딕셔너리에 새로 생성합니다.
          // 이미 등록되어있다면 무시합니다.
          if (is_external(label) == false) {
            externLabelDict[label] = new GlobalLabelInfo
              (objectIndex, segment_target, label);
          }
          continue; // 전역 레이블 지정자에 대한 처리를 종료합니다.
        }
        else if (lineToken == 'end') { // 프로그램 시작 지점이 발견되었다면
          label = lineBuffer.get_token(); // 다음 토큰을 획득합니다.
          Linker.entrypoint = label; // 시작 지점을 보관합니다.
          continue;
        }
        
        // 데이터 세그먼트를 처리합니다.
        if (segment_target == 'data') {
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
              throw new LinkerException
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
          // 레이블의 정의를 발견했다면
          if (line.charAt(line.length-1) == ':') {
            // 레이블 이름을 획득합니다.
            var label = line.substr(0, line.length-1);
            
            // 외부 레이블 딕셔너리에 등록되어있다면
            if (is_external(label)) {
              // 레이블 중복 정의로 간주하고 예외 처리합니다.
              throw new LinkerException
                ('label name is same with included external label');
            }
            // 전역 레이블 딕셔너리에 등록되어있다면
            else if (is_global(label)) {
              // 전역 레이블 정보 객체를 획득합니다.
              var gLabelInfo = globalLabelDict[label];
              
              // 현재 목적 파일의 인덱스와 발견한 레이블 정의를 기록합니다.
              gLabelInfo.index = objectIndex;
              gLabelInfo.offset = sizeOfCode;
            }
            // 레이블이 딕셔너리에 없는 경우 생성합니다.
            else if (labelInfoDict[label] == undefined) {
              labelInfoDict[label] = new LabelInfo(segment_target, label);
              
              // 레이블 딕셔너리에 정보를 등록합니다.
              labelInfoDict[label].offset = sizeOfCode;
            }
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
              
              // 외부 레이블이라면
              if (is_external(label)) {
                // 외부 레이블 정보 객체를 획득합니다.
                var eLabelInfo = externLabelDict[label];

                // 참조하고 있는 위치를 보관합니다.
                eLabelInfo.refered.push({
                  objectIndex:objectIndex, offset:refered_addr
                });
              }
              // 전역 레이블이라면
              else if (is_global(label)) {
                // 전역 레이블 정보 객체를 획득합니다.
                var gLabelInfo = globalLabelDict[label];
                
                // 참조하고 있는 위치를 보관합니다.
                gLabelInfo.refered.push({
                  objectIndex:objectIndex, offset:refered_addr
                });
              }
              // 레이블이 딕셔너리에 등록되지 않았다면 등록합니다.
              else if (labelInfoDict[label] == null) {
                labelInfoDict[label] = new LabelInfo(segment_target, label);

                // 참조하고 있는 위치를 보관합니다.
                labelInfoDict[label].refered.push(refered_addr);
              }
              else {
                // 참조하고 있는 위치를 보관합니다.
                labelInfoDict[label].refered.push(refered_addr);
              }
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

                // 외부 레이블이라면
                if (is_external(label)) {
                  // 외부 레이블 정보 객체를 획득합니다.
                  var eLabelInfo = externLabelDict[label];

                  // 참조하고 있는 위치를 보관합니다.
                  eLabelInfo.refered.push({
                    objectIndex:objectIndex, offset:refered_addr
                  });
                }
                // 전역 레이블이라면
                else if (is_global(label)) {
                  // 전역 레이블 정보 객체를 획득합니다.
                  var gLabelInfo = globalLabelDict[label];

                  // 참조하고 있는 위치를 보관합니다.
                  gLabelInfo.refered.push({
                    objectIndex:objectIndex, offset:refered_addr
                  });
                }
                // 레이블이 딕셔너리에 등록되지 않았다면 등록합니다.
                else if (labelInfoDict[label] == undefined) {
                  labelInfoDict[label] = new LabelInfo(segment_target, label);

                  // 참조하고 있는 위치를 보관합니다.
                  labelInfoDict[label].refered.push(refered_addr);
                }
                else {
                  // 참조하고 있는 위치를 보관합니다.
                  labelInfoDict[label].refered.push(refered_addr);
                  
                }
              }
              // 레이블이 아니라면 그냥 피연산자로 취급합니다.
              else {
                s += info.right;
              }
            }
          } // 인자가 존재하는 경우의 s 처리 종료
          
          // 획득한 줄 텍스트를 보관합니다.
          segment[segment_target].push({
            text:s, mnemonic:info.mnemonic, left:info.left, right:info.right
          });
          // 널 문자까지 세서 현재까지 획득한 코드 길이를 구합니다.
          sizeOfCode += (s.length + 1);
        }
        
      } catch (ex) {
        if (ex instanceof LinkerException) {
          log('Linker.load: ');
          log(i + ': [' + lines[i] + '] ' + ex.description);
        }
        else {
          throw ex;
        }
      }
    }
    
    // 외부 레이블 정보를 모두 공용 전역 레이블 딕셔너리로 옮깁니다.
    for (label in externLabelDict) {
      // 외부 레이블 정보를 획득합니다.
      var info = externLabelDict[label];

      // 전역 레이블 딕셔너리에 정보가 있다면
      if (is_public(label)) {
        // 전역 레이블 정보를 획득합니다.
        var gLabelInfo = Linker.GlobalLabelDict[label];

        // 참조 위치 배열에 참조 위치를 추가합니다.
        var ref = info.refered;
        for (var i=0, len=ref.length; i<len; ++i) {
          gLabelInfo.refered.push(ref[i]);
        }

      }
      // 전역 레이블 딕셔너리에 정보가 없다면 바로 대치합니다.
      else {
        Linker.GlobalLabelDict[label] = info;
      }
    }
    // 전역 레이블 정보를 모두 공용 전역 레이블 딕셔너리로 옮깁니다.
    for (label in globalLabelDict) {
      // 외부 레이블 정보를 획득합니다.
      var info = globalLabelDict[label];

      // 전역 레이블 딕셔너리에 정보가 있다면
      if (is_public(label)) {
        // 전역 레이블 정보를 획득합니다.
        var gLabelInfo = Linker.GlobalLabelDict[label];

        if (info.offset >= 0) {
          gLabelInfo.index = info.index;
          gLabelInfo.offset = info.offset;
        }

        // 참조 위치 배열에 참조 위치를 추가합니다.
        var ref = info.refered;
        for (var i=0, len=ref.length; i<len; ++i) {
          gLabelInfo.refered.push(ref[i]);
        }

      }
      // 전역 레이블 딕셔너리에 정보가 없다면 바로 대치합니다.
      else {
        Linker.GlobalLabelDict[label] = info;
      }
    }

    // 목적 파일 정보를 보관하는 새 객체를 생성합니다.
    var objectInfo = new ObjectInfo(segment, labelInfoDict, sizeOfData, sizeOfCode);
    Linker.ObjectInfoList.push(objectInfo);
    
    // 목적 파일 리스트의 데이터 세그먼트, 코드 세그먼트의 크기를 구합니다.
    Linker.sizeOfData += sizeOfData;
    Linker.sizeOfCode += sizeOfCode;
  }
  /**
  불러온 목적 파일을 링크합니다.
  @param {string} filename
  */
  function link(filename) {
    var Linker = Program.Linker;
    var ObjectList = Linker.ObjectInfoList;
    var GlobalDict = Linker.GlobalLabelDict;
    
    // 1. 전역 레이블의 정의를 계산합니다.
    var imageBase = Linker.imageBase;
    var dataBases = [];
    var codeBases = [];
    var baseOfData = 0;
    var baseOfCode = 0;
    var sizeOfData = Linker.sizeOfData;
    // 목적 파일 정보를 순회하면서 세그먼트의 시작점을 찾아 보관합니다.
    for (var i=0, len=ObjectList.length; i<len; ++i) {
      // 목적 파일 정보를 획득합니다.
      var objectInfo = ObjectList[i];
      
      // i번째 목적 파일의 시작점을 보관합니다.
      dataBases.push(baseOfData);
      codeBases.push(baseOfCode);
      
      // i+1번째 목적 파일의 시작점을 획득합니다.
      baseOfData += objectInfo.sizeOfData;
      baseOfCode += objectInfo.sizeOfCode;
    }
    // 획득한 세그먼트의 시작점을 바탕으로 전역 레이블의 정의를 계산합니다.
    for (gLabel in GlobalDict) {
      // 전역 레이블 정보를 획득합니다.
      var globalInfo = GlobalDict[gLabel];
      
      // 전역 레이블의 위치는
      // 1. 세그먼트의 시작점(imageBase)
      // 2. 코드 세그먼트의 시작점(sizeOfData)
      // 3. 코드 세그먼트에서 목적 파일의 코드 세그먼트 시작점(codeBases)
      // 4. 세그먼트 시작점으로부터의 오프셋(offset)
      // 의 합입니다.
      globalInfo.offset +=
        (imageBase + sizeOfData + codeBases[globalInfo.index]);

      // 전역 레이블의 참조 위치는
      // 1. 세그먼트의 시작점(imageBase)
      // 2. 코드 세그먼트의 시작점(sizeOfData)
      // 3. 코드 세그먼트에서 참조 목적 파일의 코드 세그먼트 시작점(codeBases)
      // 4. 세그먼트 시작점으로부터의 오프셋(offset)
      // 의 합입니다.
      var ref = globalInfo.refered;
      for (var j=0, gCount=ref.length; j<gCount; ++j) {
        ref[j].offset +=
          (imageBase + sizeOfData + codeBases[ref[j].objectIndex]);
      }

      // 이후부터 목적 파일의 인덱스를 신경쓰지 않습니다.
      globalInfo.index = -1;
    }
    
    // 실행 가능한 목적 파일의 코드를 기록할 문자열 스트림입니다.
    var dataStream = new Program.Stream.StringStream();
    var codeStream = new Program.Stream.StringStream();
    
    // 세그먼트 스트림에 맞게 정보를 출력합니다.
    for (var i=0, len=ObjectList.length; i<len; ++i) {
      // 목적 파일 정보를 획득합니다.
      var objectInfo = ObjectList[i];
      
      // 지역 레이블의 정의와 참조를 계산합니다.
      var labelDict = objectInfo.labelInfoDict;
      for (label in labelDict) {
        // 지역 레이블 정보를 획득합니다.
        var labelInfo = labelDict[label];
        
        // 구하려는 레이블의 소속에 따라 시작점을 결정합니다.
        var segmentBase = 0;
        if (labelInfo.segmentName == 'data') {
          segmentBase = dataBases[i];
          
          // 지역 레이블의 위치는
          // 1. 세그먼트의 시작점(imageBase)
          // 2. 세그먼트에서 목적 파일의 세그먼트 시작점(segmentBase)
          // 3. 세그먼트 시작점으로부터의 오프셋(offset)
          // 의 합입니다.
          labelInfo.offset += (imageBase + segmentBase);

          // 지역 레이블의 참조 위치는
          // 1. 세그먼트의 시작점(imageBase)
          // 2. 세그먼트에서 목적 파일의 세그먼트 시작점(segmentBase)
          // 3. 세그먼트 시작점으로부터의 오프셋(offset)
          // 의 합입니다.
          var ref = labelInfo.refered;
          for (var j=0, gCount=ref.length; j<gCount; ++j) {
            ref[j] += (imageBase + segmentBase);
          }
        }
        else {
          segmentBase = codeBases[i];
          
          // 지역 레이블의 위치는
          // 1. 세그먼트의 시작점(imageBase)
          // 2. 코드 세그먼트의 시작점(sizeOfData)
          // 3. 세그먼트에서 목적 파일의 세그먼트 시작점(segmentBase)
          // 4. 세그먼트 시작점으로부터의 오프셋(offset)
          // 의 합입니다.
          labelInfo.offset += (imageBase + sizeOfData + segmentBase);

          // 지역 레이블의 참조 위치는
          // 1. 세그먼트의 시작점(imageBase)
          // 2. 코드 세그먼트의 시작점(sizeOfData)
          // 3. 세그먼트에서 목적 파일의 세그먼트 시작점(segmentBase)
          // 4. 세그먼트 시작점으로부터의 오프셋(offset)
          // 의 합입니다.
          var ref = labelInfo.refered;
          for (var j=0, gCount=ref.length; j<gCount; ++j) {
            ref[j] += (imageBase + sizeOfData + segmentBase);
          }

        }
      }
      
      // 데이터 세그먼트 스트림에 데이터를 출력합니다.
      var segmentData = objectInfo.segment.data;
      for (var j=0, size=segmentData.length; j<size; ++j) {
        // 데이터 요소를 획득합니다.
        var data = segmentData[j];
        
        // 데이터 세그먼트에 요소 크기 지시어를 삽입합니다.
        var typeString = '';
        switch (data.typeSize) {
          case 1: typeString = 'db'; break;
          case 2: typeString = 'dw'; break;
          case 4: typeString = 'dd'; break;
        }
        
        // 데이터 세그먼트 스트림에 출력합니다.
        dataStream.writeln('%s %s', typeString, data.value);
      }
      // 코드 세그먼트 스트림에 데이터를 출력합니다.
      var segmentCode = objectInfo.segment.code;
      for (var j=0, size=segmentCode.length; j<size; ++j) {
        // 코드 세그먼트로부터 코드를 가져옵니다.
        var code = segmentCode[j];
        
        // 피연산자가 비어있지 않은 경우
        if (code.left != undefined) {
          var left = '', right = '';
          var leftLabel = null, rightLabel = null;
          
          // 피연산자가 레이블이라면 레이블 이름을 획득합니다.
          if (is_label_name(code.left)) { // 레이블이라면
            var leftLabel = code.left;
            
            var leftInfo = null;
            if (is_public(leftLabel)) {
              leftInfo = Linker.GlobalLabelDict[leftLabel];
            }
            else {
              leftInfo = labelDict[leftLabel];
            }
            
            // 획득한 레이블의 정의로 대치합니다.
            left = Handy.format(' 0x%04x', leftInfo.offset);
          }
          else { // 레이블이 아니라면 그냥 추가합니다.
            left = ' ' + code.left;
          }
          if (code.right != undefined) { // 오른쪽 피연산자가 있다면
            if (is_label_name(code.right)) { // 레이블이라면
              var rightLabel = code.right;
              
              var rightInfo = labelDict[rightLabel];
              if (is_public(rightLabel)) {
                rightInfo = Linker.GlobalLabelDict[rightLabel];
              }
              else {
                rightInfo = labelDict[rightLabel];
              }
              
              // 획득한 레이블의 정의로 대치합니다.
              right = Handy.format(',0x%04x', rightInfo.offset);
            }
            else { // 레이블이 아니라면 그냥 추가합니다.
              right = ',' + code.right;
            }
          }
          
          // 코드 세그먼트의 코드를 형식에 맞춰 출력합니다.
          var text = Handy.format
            ('%s%s%s', code.mnemonic, left, right);
          
          // 형식화된 문자열을 코드 세그먼트 스트림에 출력합니다.
          codeStream.writeln(text);
        }
        else {
          // 가져온 코드를 스트림에 출력합니다.
          codeStream.writeln(code.text);
        }
      }
    }
    
    // 파일에 출력합니다.
    var sstream = new Program.Stream.StringStream();
    sstream.writeln('.data');
    sstream.writeln(dataStream.str);
    sstream.writeln('.code');
    sstream.writeln(codeStream.str);
    
    // 진입점의 레이블을 획득합니다.
    var entryLabel = Linker.entrypoint;
    
    // 진입점의 절대 위치를 획득합니다.
    var entrypoint = Linker.GlobalLabelDict[entryLabel].offset;
    
    // 파일의 끝에 기록합니다.
    sstream.writeln('call 0x%04x', entrypoint);
    sstream.write('exit');
    
    HandyFileSystem.save(filename, sstream.str);
    
//    test();
    log('link complete');
  }
  /**
  목적 파일 리스트를 비웁니다.
  */
  function clear() {
    var Linker = Program.Linker;
    Linker.ObjectInfoList = [];
    Linker.GlobalLabelDict = {};
    Linker.sizeOfData = 0;
    Linker.sizeOfCode = 0;
  }
  
  linker.load = load;
  linker.link = link;
  linker.clear = clear;

  program.Linker = linker;
}