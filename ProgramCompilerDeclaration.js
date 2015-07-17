/**
C의 선언을 분석합니다.
*/
function initProgramCompilerDeclaration(compiler, CompilerException) {
  var _Declaration = {};
  
  // 형식 정의
  /**
  선언 지정자 형식입니다.
  */
  function DeclarationSpecifier(sc_spec, type_spec, type_qlif) {
    this.storageClassSpecifier = sc_spec;
    this.typeSpecifier = type_spec;
    this.typeQualifier = type_qlif;
  }
  DeclarationSpecifier.prototype.toString = function() {
    var sc_spec = this.storageClassSpecifier;
    var typespec = this.typeSpecifier;
    var typeqlif = this.typeQualifier;
    // [ static const int ]와 같이 출력됩니다.
    return Handy.format('[%s%s%s ]',
                        (sc_spec ? ' ' + sc_spec : ''),
                        ((typeqlif.length > 0) ? ' ' + typeqlif : ''),
                        ((typespec.length > 0) ? ' ' + typespec : ''));
  }
  var StorageClassSpecifierDict = {
    auto: true, register: true, static: true, extern: true, typedef: true
  };
  var TypeQualifierDict = {
    const: true, volatile: true,
  };
  var TypeSpecifierDict = {
    void: true, char: true, short: true, int: true,
    long: true, float: true, double: true, signed: true,
    unsigned: true, struct: true, union: true, enum: true
  };
  /**
  초기 선언자 형식입니다.
  @param {Declarator} declarator
  @param {Expression} initializer
  */
  function InitDeclarator(declarator, initializer) {
    this.declarator = declarator;
    this.initializer = initializer;
  }
  InitDeclarator.prototype.toString = function() {
    var declarator = getValid(this.declarator, '');
    var initializer = getValid(this.initializer, '');
    return Handy.format('[%s:%s]', declarator, initializer);
  }
  /**
  선언자 형식입니다.
  @param {string} identifier
  @param {Array.<string>} descriptor
  */
  function Declarator(identifier, descriptor) {
    this.identifier = identifier;
    this.descriptor = descriptor;
  }
  Declarator.prototype.toString = function() {
    var identifier = getValid(this.identifier, '');
    var descriptor = getValid(this.descriptor, '');
    return Handy.format('[%s:%s]', identifier, descriptor);
  }
  /**
  매개변수 선언 형식입니다.
  @param {DeclarationSpecifier} declspec
  @param {Declarator} paramdecl
  */
  function ParameterDeclaration(declspec, paramdecl) {
    this.declarationSpecifier = declspec;
    this.parameterDeclarator = paramdecl;
  }
  ParameterDeclaration.prototype.toString = function() {
    var declspec = getValid(this.declarationSpecifier, '');
    var paramdecl = getValid(this.parameterDeclarator, '');
    return Handy.format('%s%s', paramdecl, declspec);
  }
  /**
  선언 형식입니다.
  @param {DeclarationSpecifier} declspec
  @param {Array.<InitDeclarator>} init_decl_list
  */
  function DeclarationInfo(declspec, init_decl_list) {
    this.declarationSpecifier = declspec;
    this.initDeclaratorList = init_decl_list;
  }
  DeclarationInfo.prototype.toString = function() {
    return Handy.format
      ('[%s%s]', this.declarationSpecifier, this.initDeclaratorList);
  };
  
  /**
  매개변수 형식 리스트를 문자열로 반환합니다.
  */
  function ParameterTypeList_toString() {
    return '(' + Array.prototype.toString.call(this) + ')';
  }
  
  // 메서드 정의
  /**
  선언 지정자를 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  @return {DeclarationSpecifier}
  */
  function getDeclarationSpecifier(buffer) {
    // 선언 지정자 획득에 실패하면 획득 이전으로 포인터를 복구합니다.
    var originIndex = buffer.idx;
    try {
      // 토큰을 획득하기 직전의 인덱스를 보존합니다.
      var prevIndex = buffer.idx;
      // 선언 지정자 정보를 담을 변수입니다.
      var sc_spec = null, type_spec = [], type_qlif = [];
      
      // 선언 지정자 정보를 획득하는 반복문입니다.
      while (buffer.is_empty() == false) { // 버퍼가 비어있는 동안
        prevIndex = buffer.idx; // 토큰 획득 이전의 위치를 보존합니다.
        var token = buffer.get_ctoken(); // 토큰을 획득합니다.
        
        // 기억 형태 지정자 토큰인 경우에 대해 처리합니다.
        if (isStorageClassSpecifierToken(token)) {
          if (sc_spec != null) { // 기억 형태 지정자는 두 개 이상 지정될 수 없습니다.
            throw new CompilerException
              ('cannot declare object with 2 or more storage class specifiers');
          }
          // 획득한 기억 형태 지정자를 기억합니다.
          sc_spec = token;
        }
        // 형식 한정자 토큰인 경우에 대해 처리합니다.
        else if (isTypeQualifierToken(token)) {
          // 획득한 형식 한정자를 기억합니다.
          type_qlif.push(token);
        }
        // 형식 지정자 토큰인 경우에 대해 처리합니다.
        else if (isTypeSpecifierToken(token)) {
          // 획득한 형식 지정자를 기억합니다.
          type_spec.push(token);
        }
        // 그 외의 경우 선언 지정자가 아니므로 획득하면 안 됩니다.
        else {
          buffer.idx = prevIndex; // 토큰 위치를 복구합니다.
          break; // 선언 지정자 획득 반복문을 탈출합니다.
        }
      }
      
      // 획득한 토큰이 아무 것도 없으면 예외 처리합니다.
      if ((sc_spec == null)
          && (type_spec.length == 0)
          && (type_qlif.length == 0))
        throw new CompilerException('undeclared identifier');
      
      // 획득한 정보를 바탕으로 선언 지정자 정보 객체를 생성합니다.
      var declspcf = new DeclarationSpecifier
        (sc_spec, type_spec, type_qlif);
      // 생성한 선언 지정자 정보 객체를 반환합니다.
      return declspcf;
      
    } catch (ex) {
      // 선언 지정자 획득에 실패했으므로 획득 이전으로 포인터를 복구합니다.
      buffer.idx = originIndex;
      return null;
    }
  }
  /**
  기억 형태 지정자 토큰이라면 true, 아니라면 false를 반환합니다.
  @param {string} token
  @return {boolean}
  */
  function isStorageClassSpecifierToken(token) {
    return (StorageClassSpecifierDict[token] != undefined);
  }
  /**
  형식 지정자 토큰이라면 true, 아니라면 false를 반환합니다.
  @param {string} token
  @return {boolean}
  */
  function isTypeSpecifierToken(token) {
    return (TypeSpecifierDict[token] != undefined);
  }
  /**
  형식 한정자 토큰이라면 true, 아니라면 false를 반환합니다.
  @param {string} token
  @return {boolean}
  */
  function isTypeQualifierToken(token) {
    return (TypeQualifierDict[token] != undefined);
  }
  
  /**
  초기 선언자 리스트를 획득합니다.
  @param {StringBuffer} buffer
  @return {Array.<InitDeclarator>}
  */
  function getInitDeclaratorList(buffer) {
    // 초기 선언자에 대한 리스트를 생성합니다.
    var init_decl_list = [];
    
    // 버퍼에 데이터가 남아있는 동안
    while (buffer.is_empty() == false) {
      // 초기 선언자를 먼저 획득합니다.
      var initDeclarator = getInitDeclarator(buffer);

      // 획득한 초기 선언자를 리스트에 추가합니다.
      init_decl_list.push(initDeclarator);

      // 다음 토큰의 시작점으로 버퍼 포인터를 맞춥니다.
      buffer.trim();
      
      // 다음 토큰이 반점이 아니라면, 초기 선언자 리스트 분석을 종료합니다.
      if (buffer.peekc() != ',')
        break;
      
      // 초기 선언자 리스트 분석을 진행합니다. 반점은 지나갑니다.
      buffer.getc();
    }
    
    // 획득한 초기 선언자의 리스트를 반환합니다.
    return init_decl_list;
  }
  /**
  초기 선언자를 획득합니다.
  @param {StringBuffer} buffer
  @return {InitDeclarator}
  */
  function getInitDeclarator(buffer) {
    // 반환할 초기 선언자에 대한 변수입니다.
    var initDeclarator = null;

    // 선언자를 획득합니다.
    var declarator = getDeclarator(buffer);

    // 다음 토큰의 시작점으로 버퍼 포인터를 맞춥니다.
    buffer.trim();

    // 다음 토큰이 등호라면 초기 값을 획득합니다.
    if (buffer.peekc() == '=') {
      buffer.getc(); // 등호 토큰을 지나갑니다.

      var initializer; // 초기 값을 획득하기 위한 변수를 생성합니다.
      /* ... */

      // 선언자와 초기 값으로 초기 선언자 객체를 생성합니다.
      initDeclarator = new InitDeclarator(declarator, initializer);
    }
    // 등호가 아니라면 초기 선언자 분석을 종료합니다.
    else {
      // 선언자로 초기 선언자 객체를 생성합니다.
      initDeclarator = new InitDeclarator(declarator);
    }

    // 초기 선언자 객체를 반환합니다.
    return initDeclarator;
  }
  /**
  선언자를 획득합니다.
  @param {StringBuffer} buffer
  @return {Declarator}
  */
  function getDeclarator(buffer) {
    // 토큰 획득 이전에 버퍼 포인터를 보관합니다.
    var originIndex = buffer.idx;
    
    // 선언자 토큰에 대한 빈 벡터를 생성합니다.
    var tokenArray = [];

    // 선언자 토큰을 생성한 벡터에 출력합니다.
    dcl(buffer, tokenArray);
    if (tokenArray.length == 0) { // 획득한 토큰이 없는 경우
      buffer.idx = originIndex; // 실패한 것으로 간주하고 null을 반환합니다.
      return null;
    }

    // 획득한 토큰 벡터를 바탕으로 선언자 객체를 생성합니다.
    var identifier = tokenArray[0];
    var descriptor = Handy.toArray(tokenArray, 1);
    var declarator = new Declarator(identifier, descriptor);

    // 선언자 객체를 반환합니다.
    return declarator;
  }
  /**
  토큰이 포인터라면 true, 아니면 false를 반환합니다.
  @param {string} token
  @return {boolean}
  */
  function isPointerToken(token) {
    // 포인터라면 별표 기호거나 형식 한정자 토큰입니다.
    return (token == '*' || isTypeQualifierToken(token));
  }

  /**
  선언자를 분석한 결과를 토큰 배열에 저장합니다.
  @param {StringBuffer} bin
  @param {Array.<string>} vout
  */
  function dcl(bin, vout) {
    // 포인터에 대한 스택을 생성합니다.
    var pointerStack = new Array();
    while (bin.is_empty() == false) { // 버퍼에 문자열이 남아있는 동안
      var prevIndex = bin.idx; // 토큰 획득 이전의 인덱스를 보존합니다.
      
      var token = bin.get_ctoken(); // 토큰을 획득합니다.
      if (isPointerToken(token) == false) { // 획득한 토큰이 포인터가 아니라면
        bin.idx = prevIndex; // 토큰 획득 이전의 인덱스를 복구합니다.
        break; // 반복문을 탈출합니다.
      }
      
      // 포인터 스택에 포인터를 푸시 합니다.
      pointerStack.push(token);

      // 다음 토큰의 시작 지점으로 버퍼 포인터를 옮깁니다.
      bin.trim();
    }
    
    // 포인터 획득이 끝났으므로 직접 선언자를 분석합니다.
    dirdcl(bin, vout);
    
    // 스택에 존재하는 포인터를 토큰 배열에 저장합니다.
    while (pointerStack.length > 0) {
      var pointer = pointerStack.pop();
      vout.push(pointer);
    }
  }
  /**
  직접 선언자를 분석한 결과를 토큰 배열에 저장합니다.
  @param {StringBuffer} bin
  @param {Array} vout
  */
  function dirdcl(bin, vout) {
    // 다음 토큰의 시작 지점으로 버퍼 포인터를 옮깁니다.
    bin.trim();
    
    // 문자를 획득해본 다음 조건에 맞게 분기합니다.
    if (bin.peekc() == '(') { // 소괄호가 발견되었다면
      // 직접 선언자의 2번 정의 ( declarator )로 간주합니다.
      bin.getc(); // 발견한 여는 소괄호를 지나갑니다.
      dcl(bin, vout); // 선언자 분석을 시작합니다.
      
      // 선언자 분석 종료 후 닫는 소괄호가 발견되었는지 확인합니다.
      if (bin.peekc() != ')') { // 다음 토큰이 닫는 소괄호가 아니라면
        // 일단 함수를 탈출하고, 선언자 분석을 요청한 메서드가
        // 이 토큰을 처리하도록 책임을 넘깁니다.
        return;
      }
      
      // 닫는 소괄호는 사용했으므로 지나갑니다.
      bin.getc();
    }
    else if (is_fnamch(bin.peekc())) { // 식별자의 시작이라면
      var identifier = bin.get_ctoken(); // 식별자를 획득합니다.
      vout.push(identifier); // 획득한 식별자를 토큰 벡터에 넣습니다.
    }
    bin.trim(); // 다음 토큰의 시작 지점으로 버퍼 포인터를 옮깁니다.
    
    // 배열과 함수에 대해 처리합니다.
    while (bin.peekc() == '(' || bin.peekc() == '[') {
      if (bin.peekc() == '(') { // 함수 기호의 시작이라면
        bin.getc(); // 함수의 시작으로서 분석한, 여는 소괄호는 생략합니다.
        
        // 매개변수 형식 리스트를 획득합니다.
        var paramTypeList = getParameterTypeList(bin);
        
        // 매개변수 형식 리스트를 벡터에 넣습니다.
        vout.push(paramTypeList);
        
        bin.trim(); // 다음 토큰의 시작 지점까지 버퍼 포인터를 옮깁니다.
        if (bin.peekc() != ')') // 다음 토큰이 닫는 소괄호가 아니라면
          break; // 토큰의 해석 책임을 dirdcl을 호출한 함수로 넘깁니다.
        
        bin.getc(); // 해석한 닫는 소괄호를 지나갑니다.
      }
      else { // 배열 기호의 시작이라면
        /* ... */
      }
    }
  }
    
  /**
  매개변수 형식 리스트를 획득합니다.
  @param {StringBuffer} buffer
  @return {Array.<Array.<ParameterDeclaration>>}
  */
  function getParameterTypeList(buffer) {
    // 매개변수 형식에 대한 리스트를 생성합니다.
    var param_type_list = [];
    
    while (buffer.is_empty() == false) { // 버퍼에 데이터가 남아있는 동안
      var prevIndex = buffer.idx; // 토큰 획득 이전의 위치를 보관합니다.
      var paramdecl = getParameterDeclaration(buffer); // 매개변수 선언을 획득합니다.
      
      if (paramdecl == null) { // 매개변수 선언 획득에 실패한 경우
        buffer.idx = prevIndex; // 토큰 획득 이전으로 버퍼 포인터를 복구합니다.
        var token = buffer.get_ctoken(); // 토큰 획득을 시도합니다.
        if (token != '...') { // 가변 인자 토큰이 아니라면
          buffer.idx = prevIndex; // 다시 버퍼 포인터를 복구합니다.
        }
        // 매개변수 선언 획득 반복문을 탈출합니다.
        break;
      }
      
      // 획득한 매개변수 선언을 매개변수 형식 리스트에 넣습니다.
      param_type_list.push(paramdecl);
      
      // 다음 토큰의 시작점으로 버퍼 포인터를 맞춥니다.
      buffer.trim();
      // 다음 토큰이 반점이 아니라면, 초기 선언자 리스트 분석을 종료합니다.
      if (buffer.peekc() != ',')
        break;
      // 초기 선언자 리스트 분석을 진행합니다. 반점은 지나갑니다.
      buffer.getc();
    }
    
    // 매개변수 형식 리스트의 toString을 오버라이딩합니다.
    param_type_list.toString = ParameterTypeList_toString;
    
    // 매개변수 형식 리스트를 반환합니다.
    return param_type_list;
  }
  /**
  매개변수 선언을 획득합니다. 실패시 null을 반환합니다.
  @param {StringBuffer} buffer
  @return {ParameterDeclaration}
  */
  function getParameterDeclaration(buffer) {
    // 매개변수 선언에 대한 변수를 생성합니다.
    var paramdecl = null;
    
    // 선언 지정자를 획득합니다.
    var declspec = getDeclarationSpecifier(buffer);
    
    // 추상 선언자 획득을 시도합니다.
    var declarator = getAbstractDeclarator(buffer);
    if (declarator == null) // 선언자 획득에 실패한 경우
      return null; // null을 반환합니다.
    
    // 획득한 정보를 바탕으로 매개변수 선언 객체를 생성합니다.
    paramdecl = new ParameterDeclaration(declspec, declarator);
    
    // 매개변수 선언 객체를 반환합니다.
    return paramdecl;
  }
  /**
  추상 선언자를 획득합니다. 실패 시 null을 반환합니다.
  @param {StringBuffer} buffer
  @return {Declarator}
  */
  function getAbstractDeclarator(buffer) {
    // 선언자 객체에 대한 변수를 생성합니다.
    var declarator = null;
    
    // 선언자 토큰에 대한 빈 벡터를 생성합니다.
    var tokenArray = [];
    
    // 가장 첫 원소를 식별자로 간주하므로, 첫 원소를 null로 채웁니다.
    tokenArray.push(null);

    // 선언자 토큰을 생성한 벡터에 출력합니다.
    absdcl(buffer, tokenArray);

    // 획득한 토큰 벡터를 바탕으로 선언자 객체를 생성합니다.
    var descriptor = Handy.toArray(tokenArray, 1);
    declarator = new Declarator(null, descriptor);
    
    // 선언자 객체를 반환합니다.
    return declarator;
  }
  /**
  추상 선언자를 분석한 결과를 토큰 배열에 저장합니다.
  @param {StringBuffer} bin
  @param {Array.<string>} vout
  */
  function absdcl(bin, vout) {
    // 포인터에 대한 스택을 생성합니다.
    var pointerStack = new Array();
    while (bin.is_empty() == false) { // 버퍼에 문자열이 남아있는 동안
      var prevIndex = bin.idx; // 토큰 획득 이전의 인덱스를 보존합니다.
      
      var token = bin.get_ctoken(); // 토큰을 획득합니다.
      if (isPointerToken(token) == false) { // 획득한 토큰이 포인터가 아니라면
        bin.idx = prevIndex; // 토큰 획득 이전의 인덱스를 복구합니다.
        break; // 반복문을 탈출합니다.
      }
      
      // 포인터 스택에 포인터를 푸시 합니다.
      pointerStack.push(token);

      // 다음 토큰의 시작 지점으로 버퍼 포인터를 옮깁니다.
      bin.trim();
    }
    
    // 포인터 획득이 끝났으므로 직접 선언자를 분석합니다.
    absdirdcl(bin, vout);
    
    // 스택에 존재하는 포인터를 토큰 배열에 저장합니다.
    while (pointerStack.length > 0) {
      var pointer = pointerStack.pop();
      vout.push(pointer);
    }
  }
  /**
  추상 직접 선언자를 분석한 결과를 토큰 배열에 저장합니다.
  @param {StringBuffer} bin
  @param {Array} vout
  */
  function absdirdcl(bin, vout) {
    // 다음 토큰의 시작 지점으로 버퍼 포인터를 옮깁니다.
    bin.trim();
    
    // 문자를 획득해본 다음 조건에 맞게 분기합니다.
    if (bin.peekc() == '(') { // 소괄호가 발견되었다면
      // 직접 선언자의 2번 정의 ( declarator )로 간주합니다.
      bin.getc(); // 발견한 여는 소괄호를 지나갑니다.
      absdcl(bin, vout); // 선언자 분석을 시작합니다.
      
      // 선언자 분석 종료 후 닫는 소괄호가 발견되었는지 확인합니다.
      if (bin.peekc() != ')') { // 다음 토큰이 닫는 소괄호가 아니라면
        // 일단 함수를 탈출하고, 선언자 분석을 요청한 메서드가
        // 이 토큰을 처리하도록 책임을 넘깁니다.
        return;
      }
      
      // 닫는 소괄호는 사용했으므로 지나갑니다.
      bin.getc();
    }
    else if (is_fnamch(bin.peekc())) { // 식별자의 시작이라면
      bin.get_ctoken(); // 식별자를 무시합니다.
      vout[0] = true; // 식별자가 발견된 경우 표시합니다.
      bin.trim(); // 다음 토큰의 시작 지점으로 버퍼 포인터를 옮깁니다.
    }
    
    // 배열과 함수에 대해 처리합니다.
    while (bin.peekc() == '(' || bin.peekc() == '[') {
      if (bin.peekc() == '(') { // 함수 기호의 시작이라면
        bin.getc(); // 함수의 시작으로서 분석한, 여는 소괄호는 생략합니다.
        
        // 매개변수 형식 리스트를 획득합니다.
        var paramTypeList = getParameterTypeList(bin);
        
        // 매개변수 형식 리스트를 벡터에 넣습니다.
        vout.push(paramTypeList);
        
        bin.trim(); // 다음 토큰의 시작 지점까지 버퍼 포인터를 옮깁니다.
        if (bin.peekc() != ')') // 다음 토큰이 닫는 소괄호가 아니라면
          break; // 토큰의 해석 책임을 dirdcl을 호출한 함수로 넘깁니다.
        
        bin.getc(); // 해석한 닫는 소괄호를 지나갑니다.
      }
      else { // 배열 기호의 시작이라면
        /* ... */
      }
    }
  }
  
  /**
  선언을 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  @return {DeclarationInfo}
  */
  function getDeclarationInfo(buffer) {
    // 선언 획득 이전에 버퍼 포인터를 보관합니다.
    var originIndex = buffer.idx;
    
    // 선언 지정자 획득을 시도합니다.
    var declspec = getDeclarationSpecifier(buffer);
    if (declspec == null) {
      buffer.idx = originIndex; // 버퍼 포인터를 복구합니다.
      return null; // null을 반환합니다.
    }
    
    // 초기 선언자 리스트를 획득합니다. 선언의 정의에 의해 생략될 수 있습니다.
    var init_decl_list = getInitDeclaratorList(buffer);
    
    // 다음 토큰의 시작 지점으로 버퍼 포인터를 옮깁니다.
    buffer.trim();
    
    // 다음 토큰이 세미콜론이 아니라면 선언 획득 실패로 간주합니다.
    if (buffer.peekc() != ';') {
      buffer.idx = originIndex; // 버퍼 포인터를 복구합니다.
      return null; // null을 반환합니다.
    }
    
    // 세미콜론을 확인하는 용도로 사용했으므로 지나갑니다.
    buffer.getc();
    
    // 획득한 정보를 바탕으로 선언 정보 객체를 생성합니다.
    var declInfo = new DeclarationInfo(declspec, init_decl_list);
    
    // 획득한 선언 정보 객체를 반환합니다.
    return declInfo;
  }
  
  _Declaration.getAbstractDeclarator = getAbstractDeclarator;
  
  _Declaration.getDeclarationSpecifier = getDeclarationSpecifier;
  _Declaration.getInitDeclaratorList = getInitDeclaratorList;
  _Declaration.getDeclarationInfo = getDeclarationInfo;
  _Declaration.getDeclarator = getDeclarator;
  compiler.Declaration = _Declaration;
}