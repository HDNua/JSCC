/**
C의 수식을 분석합니다.
*/
function initProgramCompilerExpression(compiler, CompilerException) {
  var _Expression = {};
  
  // 속성 정의 이전에 정의되어야 하는 내용을 작성합니다.
  var AssignmentOperatorDict = {
    "=": true, "+=": true, "-=": true, "*=":true,
    "/=":true, "%=": true, "&=": true, "^=": true,
    "|=": true, "<<=": true, ">>=": true
  };
  var PrefixOperatorDict = {
    "sizeof": true, "++": true, "--": true,
    "+": true, "-": true, "*": true,
    "&": true, "~": true, "!": true
  };
  var BinaryOperatorDict = {
    "*": 1, "/": 1, "%": 1,
    "+": 2, "-": 2,
    "<<": 3, ">>": 3,
    "<": 4, "<=": 4, ">": 4, ">=": 4,
    "==": 5, "!=": 5,
    "&": 6,
    "^": 7,
    "|": 8,
    "&&": 9,
    "||": 10
  };
  
  // 형식 정의
  /**
  수식을 정의합니다.
  @param {Array.<AssignmentExpression>} assignExprList
  */
  function ExpressionInfo(assignExprList) {
    this.assignmentExprList = assignExprList;
  }
  ExpressionInfo.prototype.toString = function() {
    return Handy.format('%s', this.assignmentExprList);
  };
  /**
  할당식을 정의합니다.
  @param {Array} exprTokenList
  */
  function AssignmentExpression(exprTokenList) {
    this.expressionTokenList = exprTokenList;
  }
  AssignmentExpression.prototype.toString = function() {
    return Handy.format('%s', this.expressionTokenList.join(' '));
  };
  /**
  단항식을 정의합니다.
  @param {Array} exprTokenList
  */
  function UnaryExpression(exprTokenList) {
    this.expressionTokenList = exprTokenList;
  }
  UnaryExpression.prototype.toString = function() {
    return Handy.format('%s', this.expressionTokenList);
  };
  /**
  캐스트를 정의합니다.
  @param {DeclarationSpecifier} declspec
  @param {AbstractDeclarator} absdecl
  */
  function CastOperator(declspec, absdecl) {
    this.declarationSpecifier = declspec;
    this.abstractDeclarator = absdecl;
  }
  CastOperator.prototype.toString = function() {
    return Handy.format
      ('(%s%s)', this.declarationSpecifier, this.abstractDeclarator);
  };
  /**
  접미 수식을 정의합니다.
  @param {Array} exprTokenList
  */
  function PostfixExpression(exprTokenList) {
    this.expressionTokenList = exprTokenList;
  }
  PostfixExpression.prototype.toString = function() {
    return Handy.format('%s', this.expressionTokenList);
  };
  /**
  기본 수식을 정의합니다.
  @param {object} value
  */
  function PrimaryExpression(value) {
    this.value = value;
  }
  PrimaryExpression.prototype.toString = function() {
    return Handy.format('%s', this.value);
  };
  /**
  조건식을 정의합니다.
  @param {BinaryExpression} condExpr
  @param {Expression} trueExpr
  @param {ConditionalExpression} falseExpr
  */
  function ConditionalExpression(condExpr, trueExpr, falseExpr) {
    this.conditionExpression = condExpr;
    this.trueExpression = trueExpr;
    this.falseExpression = falseExpr;
  }
  ConditionalExpression.prototype.toString = function() {
    var caseExpr = '';
    if (this.trueExpression != undefined) {
      caseExpr = Handy.format('?%s:%s', this.trueExpression, this.falseExpression);
    }
    return Handy.format('%s%s', this.conditionExpression, caseExpr);
  };
  /**
  이항식을 정의합니다.
  @param {Array} exprTokenList
  */
  function BinaryExpression(exprTokenList) {
    this.expressionTokenList = exprTokenList;
  }
  BinaryExpression.prototype.toString = function() {
    return Handy.format('%s', this.expressionTokenList.join(' '));
  };
  
  // 메서드 정의
  /**
  수식을 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  @return {ExpressionInfo}
  */
  function getExpressionInfo(buffer) {
    // 수식 획득 전의 버퍼 포인터를 보관합니다.
    var originIndex = buffer.idx;
    
    // 반환할 수식 객체에 대한 변수를 생성합니다.
    var exprInfo = null;
    
    // 할당식 리스트를 획득합니다.
    var assignExprList = [];
    while (buffer.is_empty() == false) { // 버퍼에 데이터가 남아있는 동안
      // 할당식 객체를 획득합니다.
      var assignExprInfo = getAssignmentExpression(buffer);
      if (assignExprInfo == null) // 할당식 획득에 실패한 경우
        break; // 할당식 획득을 종료합니다.
      
      // 획득한 할당식을 리스트에 넣습니다.
      assignExprList.push(assignExprInfo);
      
      // 다음 토큰의 시작 지점으로 버퍼 포인터를 맞춥니다.
      buffer.trim();
      // 다음 토큰이 반점이 아니라면 탈출합니다.
      if (buffer.peekc() != ',')
        break;
      // 사용한 반점 토큰은 지나갑니다.
      buffer.getc();
    }
    // 획득한 할당식이 없으면 버퍼 포인터를 복구하고 null을 반환합니다.
    if (assignExprList.length == 0) {
      buffer.idx = originIndex;
      return null;
    }
    
    // 획득한 정보를 바탕으로 수식 객체를 생성합니다.
    exprInfo = new ExpressionInfo(assignExprList);
    // 수식 객체를 반환합니다.
    return exprInfo;
  }
  /**
  할당식을 획득합니다.
  @param {StringBuffer} buffer
  @return {AssignmentExpression}
  */
  function getAssignmentExpression(buffer) {
    var originIndex = buffer.idx; // 버퍼 포인터 위치를 보관합니다.
    var assignExpr = null; // 반환할 객체에 대한 변수를 생성합니다.

    // 할당식을 위한 수식 토큰 리스트를 만듭니다.
    var exprTokenList = [];

    while (buffer.is_empty() == false) { // 버퍼에 데이터가 남아있는 동안
      var prevIndex = buffer.idx; // 토큰 획득 이전의 버퍼 포인터를 보관합니다.
      var unaryExpr = getUnaryExpression(buffer); // 단항식 획득을 시도합니다.
      var assignOp = buffer.get_ctoken(buffer); // 다음 토큰을 획득합니다.
      if (unaryExpr && is_assign_op(assignOp)) { // 단항식과 할당 연산자 획득 성공 시
        // 획득한 요소를 리스트에 넣습니다.
        exprTokenList.push(unaryExpr);
        exprTokenList.push(assignOp);
      }
      else { // 실패한 경우 조건식을 획득하고 종료합니다.
        buffer.idx = prevIndex; // 단항식 획득 시도 전의 버퍼 포인터의 위치로 복구합니다.
        var condExpr = getConditionalExpression(buffer); // 조건식 획득을 시도합니다.
        if (condExpr == null) { // 조건식 획득에 실패했다면
          // 버퍼 포인터를 가장 처음의 위치로 복구하고 null을 반환합니다.
          buffer.idx = originIndex;
          return null;
        }
        exprTokenList.push(condExpr); // 조건식을 리스트에 넣습니다.
        break; // 반복문을 탈출합니다.
      }
    }

    // 획득한 정보를 바탕으로 객체를 생성하고 반환합니다.
    assignExpr = new AssignmentExpression(exprTokenList);
    return assignExpr;
  }
  /**
  할당 연산자라면 true, 아니면 false를 반환합니다.
  @param {string} token
  @return {boolean}
  */
  function is_assign_op(token) {
    return AssignmentOperatorDict[token] ? true : false;
  }
  /**
  단항식을 획득합니다.
  @param {StringBuffer} buffer
  @return {UnaryExpression}
  */
  function getUnaryExpression(buffer) {
    var originIndex = buffer.idx; // 최초 버퍼 포인터 위치를 보관합니다.
    var exprTokenList = []; // 단항식을 위한 수식 토큰 리스트를 만듭니다.
    
    while (buffer.is_empty() == false) { // 버퍼에 데이터가 남아있는 동안
      var prevIndex = buffer.idx; // 버퍼 포인터 위치를 보관합니다.
      var op = getPrefixOperator(buffer); // 전위 연산자 획득을 시도합니다.
      
      if (op == null) { // 토큰 획득 실패 시 접미 수식으로 간주합니다.
        buffer.idx = prevIndex; // 버퍼 포인터를 복구합니다.
        // 접미 수식을 획득합니다.
        var postExpr = getPostfixExpression(buffer);
        if (postExpr == null) { // 획득에 실패했다면
          // 버퍼 포인터를 최초 값으로 복구하고 null을 반환합니다.
          buffer.idx = originIndex;
          return null;
        }
        // 접미 수식을 수식 토큰 리스트에 넣고 종료합니다.
        exprTokenList.push(postExpr);
        break;
      }
      else if (op == 'sizeof') { // sizeof라면
        var cast = getCastOperator(buffer); // 캐스트 연산자 획득을 시도합니다.
        if (cast != null) { // 획득에 성공했다면
          // 정의에 의해 토큰 획득을 끝냅니다.
          exprTokenList.push(op);
          exprTokenList.push(cast);
          break;
        }
        // 단항식을 계속 획득합니다.
        exprTokenList.push(op);
      }
      else { // 그 외의 경우 전위 연산자로 처리합니다.
        exprTokenList.push(op);
      }
    }
    
    // 획득한 정보를 바탕으로 객체를 생성하고 반환합니다.
    var unaryExpr = new UnaryExpression(exprTokenList);
    return unaryExpr;
  }
  /**
  전위 연산자를 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  */
  function getPrefixOperator(buffer) {
    var originIndex = buffer.idx; // 최초 버퍼 포인터를 보관합니다.
    var token = buffer.get_ctoken(); // 토큰을 획득합니다.
    
    // 일반 단항 연산자인 경우 그냥 반환합니다.
    if (is_prefix_op(token))
      return token;
    else if (token == '(') { // 캐스트 연산의 시작인 경우
      var castOperator = getCastOperator(buffer); // 캐스트를 획득합니다.
      if (castOperator == null) { // 캐스트 연산자 획득에 실패한 경우
        // 버퍼 포인터를 복구하고 null을 반환합니다.
        buffer.idx = originIndex;
        return null;
      }
      
      // 다음 토큰이 닫는 소괄호라면 성공한 것으로 간주합니다.
      if (buffer.get_ctoken() == ')')
        return castOperator;
    }
    
    buffer.idx = originIndex;
    return null;
  }
  /**
  전위 연산자라면 true, 아니면 false를 반환합니다.
  @param {string} token
  @return {boolean}
  */
  function is_prefix_op(token) {
    return PrefixOperatorDict[token] ? true : false;
  }
  /**
  캐스트 연산자를 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  */
  function getCastOperator(buffer) {
    var Declaration = Program.Compiler.Declaration;
    var originIndex = buffer.idx; // 최초 버퍼 포인터를 보관합니다.
    
    try {
      // 선언 지정자를 획득합니다.
      var declspec = Declaration.getDeclarationSpecifier(buffer);
      if (declspec == null) // 획득에 실패한 경우 null을 반환합니다.
        throw new CompilerException
          ('cannot find declaration specifiers');
      // 캐스트 연산자에는 선언 지정자가 있을 수 없습니다.
      else if (declspec.storageClassSpecifier != null)
        throw new CompilerException
          ('storage class specifier found in cast operator');
      
      // 추상 선언자를 획득합니다.
      var absdecl = Declaration.getAbstractDeclarator(buffer);
      // 캐스트 연산자에서는 식별자가 발견되면 안 됩니다.
      if (absdecl.identifier != null)
        throw new CompilerException
          ('identifier found in cast operator');
      
      // 획득한 정보를 바탕으로 캐스트 연산자 객체를 생성하여 반환합니다.
      var castOperator = new CastOperator(declspec, absdecl);
      return castOperator;
    } catch (ex) {
      // 버퍼 포인터를 복구하고 null을 반환합니다.
      if (ex instanceof CompilerException) {
        buffer.idx = originIndex;
        return null;
      }
      throw ex;
    }
  }
  /**
  접미 수식을 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  */
  function getPostfixExpression(buffer) {
    var originIndex = buffer.idx; // 최초 버퍼 포인터를 보관합니다.
    try {
      // 수식 토큰 리스트를 생성합니다.
      var exprTokenList = [];
      // 기본 수식을 획득합니다.
      var primaryExpr = getPrimaryExpression(buffer);
      if (primaryExpr == null) // 기본 수식 획득 실패 시 예외 처리합니다.
        throw new CompilerException
          ('cannot find primary expression');

      // 수식 토큰 리스트에 기본 수식을 넣습니다.
      exprTokenList.push(primaryExpr);
      // 획득한 정보를 바탕으로 기본 수식 객체를 생성하고 반환합니다.
      var postExpr = new PostfixExpression(exprTokenList);
      return postExpr;
    } catch (ex) { // 실패시 포인터를 복구하고 null을 반환합니다.
      buffer.idx = originIndex;
      return null;
    }
  }
  /**
  기본 수식을 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  */
  function getPrimaryExpression(buffer) {
    var originIndex = buffer.idx; // 최초 버퍼 포인터를 보관합니다.
    try {
      var primaryExpr = null; // 기본 수식에 대한 변수입니다.
      var token = buffer.get_ctoken(); // 토큰을 획득합니다.
      var ch = token.charAt(0); // 토큰의 첫 문자를 획득합니다.
      
      // 여는 소괄호라면 4번 정의에 해당합니다.
      if (token == '(') {
        var expr = getExpressionInfo(buffer); // 수식을 획득합니다.
        if (buffer.get_ctoken() != ')') // 닫는 소괄호가 없으면
          throw new CompilerException // 예외 처리합니다.
            ('cannot find small close bracket');
        
        // 기본 수식 객체를 생성합니다.
        primaryExpr = new PrimaryExpression(expr);
      }
      // 기본 수식이라면 기본 수식 객체를 생성합니다.
      else if (is_fnamch(ch) || is_digit(ch)
               || ch == '\'' || ch == '\"') {
        primaryExpr = new PrimaryExpression(token);
      }
      else {
        throw new CompilerException
          ('invalid token found in primary expression');
      }
      return primaryExpr;
    } catch (ex) { // 실패시 포인터를 복구하고 null을 반환합니다.
      if (ex instanceof CompilerException) {
        buffer.idx = originIndex;
        return null;
      }
      throw ex;
    }
  }
  /**
  조건식을 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  @return {ConditionalExpression}
  */
  function getConditionalExpression(buffer) {
    var originIndex = buffer.idx; // 초기 버퍼 포인터를 보관합니다.
    
    try {
      // 이항 수식을 획득합니다.
      var binaryExpr = getBinaryExpression(buffer);
      
      // TODO:
      if (binaryExpr == null)
        throw new CompilerException
          ('cannot find binary expression in conditional');
      
      buffer.trim(); // 다음 토큰의 시작 지점으로 버퍼 포인터를 옮깁니다.
      
      // 물음표 토큰이 존재한다면 식을 두 개 획득합니다.
      if (buffer.peekc() == '?') {
        buffer.getc(); // 분석한 물음표 기호를 지나갑니다.
        
        // 참일 경우의 식을 획득합니다.
        var trueExpr = getExpressionInfo(buffer);
        if (buffer.get_ctoken() != ':') // 조건식의 2번 정의에 맞지 않으면
          throw new CompilerException // 예외 처리합니다.
            ('cannot find colon of conditional expression');
        
        // 거짓일 경우의 식을 획득합니다.
        var falseExpr = getConditionalExpression(buffer);
        
        // 획득한 식 중 하나라도 잘못된 식이라면 예외 처리합니다.
        if (trueExpr == null || falseExpr == null)
          throw new CompilerException
            ('empty expression found in conditional expression');
        
        // 획득한 정보를 바탕으로 조건식을 생성합니다.
        var condExpr = new ConditionalExpression
          (binaryExpr, trueExpr, falseExpr);
      }
      else {
        // 획득한 정보를 바탕으로 조건식을 생성합니다.
        var condExpr = new ConditionalExpression(binaryExpr);
      }
      
      // 생성한 조건식 객체를 반환합니다.
      return condExpr;
    } catch (ex) { // 실패시 포인터를 복구하고 null을 반환한다.
      if (ex instanceof CompilerException) {
        buffer.idx = originIndex;
        return null;
      }
      throw ex;
    }
  }
  /**
  이항 수식을 획득합니다. 실패시 포인터를 복구하고 null을 반환합니다.
  @param {StringBuffer} buffer
  @return {BinaryExpression}
  */
  function getBinaryExpression(buffer) {
    var originIndex = buffer.idx; // 최초 버퍼 포인터를 보관합니다.
    try {
      // 수식 토큰 리스트를 생성합니다.
      var exprTokenList = [];
      
      // 버퍼에 데이터가 남아있는 동안
      while (buffer.is_empty() == false) {
        var prevIndex = buffer.idx; // 이전 버퍼 포인터를 보관합니다.

        // 단항식을 획득합니다.
        var unaryExpr = getUnaryExpression(buffer);
        if (unaryExpr == null) { // 단항식 획득에 실패한 경우
          // 버퍼 포인터를 복구하고 반복문을 탈출합니다.
          buffer.idx = prevIndex;
          break;
        }
        // 획득한 단항식을 수식 토큰 리스트에 넣습니다.
        exprTokenList.push(unaryExpr);

        // 버퍼 포인터를 보관하고 다음 토큰을 획득합니다.
        prevIndex = buffer.idx;
        var token = buffer.get_ctoken();

        // 획득한 토큰이 이항 연산자가 아니라면
        if (is_binary_op(token) == false) {
          //버퍼 포인터를 복구하고 반복문을 탈출합니다.
          buffer.idx = prevIndex;
          break;
        }
        // 획득한 이항 연산자를 수식 토큰 리스트에 넣습니다.
        exprTokenList.push(token);
      }
      
      // 획득한 토큰이 없는 경우 예외 처리합니다.
      if (exprTokenList.length == 0)
        throw new CompilerException
          ('cannot find binary expression');
      
      // 이항 연산자에 대한 스택을 생성합니다.
      var opStack = [];
      var postfixTokenList = [];
      for (var i=0, len=exprTokenList.length; i<len; ++i) {
        var token = exprTokenList[i]; // 수식 토큰 리스트의 토큰을 획득합니다.
        
        // 단항식이라면 후위 표기 토큰 리스트에 넣습니다.
        if (token instanceof UnaryExpression) {
          postfixTokenList.push(token);
        }
        // 단항식이 아니라면 연산자로 간주합니다.
        else {
          // 연산자 스택에 연산자가 남아있다면 우선순위를 비교해야 합니다.
          while (opStack.length > 0) {
            // 가장 최근에 추가한 연산자를 획득합니다.
            var prevOp = opStack[opStack.length-1];
            // 새 연산자의 우선순위를 구합니다.
            var newPri = BinaryOperatorDict[token];

            // 새 연산자의 우선순위가 더 낮다면 탈출합니다.
            if (newPri < BinaryOperatorDict[prevOp])
              break;

            // 우선순위가 낮은 연산자를 빼서 수식 토큰 리스트에 넣습니다.
            postfixTokenList.push(opStack.pop());
          }

          // 획득한 이항 연산자를 수식 토큰 리스트에 넣습니다.
          opStack.push(token);          
        }
      }
      // 연산자 스택에 남은 연산자를 모두 출력합니다.
      while (opStack.length > 0) {
        postfixTokenList.push(opStack.pop());
      }

      // 획득한 정보를 바탕으로 이항 수식 객체를 생성하고 반환합니다.
      var binaryExpr = new BinaryExpression(postfixTokenList);
      return binaryExpr;
    } catch (ex) { // 실패시 버퍼 퐁니터를 복구하고 null을 반환합니다.
      if (ex instanceof CompilerException) {
        buffer.idx = originIndex;
        return null;
      }
      throw ex;
    }
  }
  /**
  이항 연산자라면 true, 아니면 false를 반환합니다.
  @param {string} token
  @return {boolean}
  */
  function is_binary_op(token) {
    return BinaryOperatorDict[token] ? true : false;
  }
  // 수식 객체의 컴파일을 수행합니다.
  function ExpressionInfo_compile(dataseg, codeseg, identifierDict) {
    // 수식 객체는 할당식의 리스트입니다.
    for (var i=0, len=this.assignmentExprList.length; i<len; ++i) {
      // 할당식을 획득합니다.
      var assignExpr = this.assignmentExprList[i];
      
      // 할당식을 컴파일 합니다.
      assignExpr.compile(dataseg, codeseg, identifierDict);
    }
  }
  ExpressionInfo.prototype.compile = ExpressionInfo_compile;
  // 할당식 객체의 컴파일을 수행합니다.
  function AssignExpr_compile(dataseg, codeseg, identifierDict) {
    var exprTokenList = this.expressionTokenList;
    
    // 가장 마지막 원소부터 컴파일을 진행합니다.
    var index = exprTokenList.length - 1;

    // 우변 식을 획득합니다.
    var rExpr = exprTokenList[index];
    // 우변 식을 컴파일 합니다.
    rExpr.compile(dataseg, codeseg, identifierDict);
    
    // 우변 식이 계산한 값을 보관합니다.
    codeseg.writeln('push eax');
    
    // 가장 처음의 원소를 해석하기 전까지
    while (index > 0) {
      // 할당 연산자를 획득합니다.
      var op = exprTokenList[--index];
      
      // 피연산자를 획득하고 컴파일 합니다.
      var lExpr = exprTokenList[--index];
      lExpr.compile(dataseg, codeseg, identifierDict);
      
      // 보관했던 우변식의 값을 꺼내어 계산에 사용합니다.
      codeseg.writeln('pop eax');
      
      // 할당 연산자가 발견된 경우의 처리입니다.
      switch (op) {
        case '=':
          codeseg.writeln('mov [ebx], eax');
          break;
      }
    }
  }
  AssignmentExpression.prototype.compile = AssignExpr_compile;
  // 조건식 객체의 컴파일을 수행합니다.
  function CondExpr_compile(dataseg, codeseg, identifierDict) {
    // conditionExpression은 ExpressionInfo 객체입니다.
    this.conditionExpression.compile(dataseg, codeseg, identifierDict);
    
    // 삼항 연산자인 경우입니다. 직접 구현해보십시오.
    if (this.trueExpression != null) {
      throw new CompilerException('not implemented');
    }
  }
  ConditionalExpression.prototype.compile = CondExpr_compile;
  // 이항식 객체의 컴파일을 수행합니다.
  function BinaryExpr_compile(dataseg, codeseg, identifierDict) {
    var exprTokenList = this.expressionTokenList;
    
    // 이항식의 1번 정의에 해당한다면 그냥 컴파일 합니다.
    if (exprTokenList.length == 1) {
      var token = exprTokenList[0];
      token.compile(dataseg, codeseg, identifierDict);
    }
    // 이항식의 2번 정의에 해당하는 경우입니다.
    else { // 1장에서 작성한 calculate_postfix의 코드와 비슷합니다.
      // 피연산자 스택을 생성합니다.
      var operandStack = [];
      
      // 수식 토큰 리스트의 모든 토큰을 분석합니다.
      for (var i=0, len=exprTokenList.length; i<len; ++i) {
        var token = exprTokenList[i]; // 토큰을 획득합니다.
        
        // 단항식인 경우 피연산자 스택에 넣습니다.
        if (token instanceof UnaryExpression) {
          operandStack.push(token);
        }
        // 그 외의 경우 연산자로 간주합니다.
        else {
          // 피연산자를 스택에서 빼냅니다.
          var right = operandStack.pop();
          var left = operandStack.pop();
          
          // 우변 식을 획득했다면 컴파일합니다.
          if (right != null) { 
            // else의 마지막 줄에 의해, 처음 반복문을 실행한 경우에만 null이 아닙니다.
            right.compile(dataseg, codeseg, identifierDict);
          }
          
          // 우변 식의 결과를 보관합니다.
          codeseg.writeln('push eax');
          
          // 좌변 식을 컴파일 합니다.
          left.compile(dataseg, codeseg, identifierDict);
          
          // 보관했던 우변 식의 결과를 가져옵니다.
          codeseg.writeln('pop edx');
          
          // 연산자에 따라 처리합니다.
          switch (token) {
            case '+':
              codeseg.writeln('add eax, edx');
              break;
          }
          
          // 반복문의 형식을 유지하되 계산한 피연산자를
          // 중복으로 계산하지 않도록 null을 넣습니다.
          operandStack.push(null);
        }
      }
    }
  }
  BinaryExpression.prototype.compile = BinaryExpr_compile;
  // 단항식 객체의 컴파일을 수행합니다.
  function UnaryExpr_compile(dataseg, codeseg, identifierDict) {
    var exprTokenList = this.expressionTokenList;
    
    // 단항식은 접미 수식과 기타 연산자의 리스트입니다.
    for (var i=0, len=exprTokenList.length; i<len; ++i) {
      var token = exprTokenList[i]; // 토큰을 획득합니다.
      
      // 접미 수식이 발견되면 컴파일 한 다음 반복문을 종료합니다.
      // 이러한 처리는 완전하지 않은 것입니다.
      if (token instanceof PostfixExpression) {
        token.compile(dataseg, codeseg, identifierDict);
        break;
      }
    }
  }
  UnaryExpression.prototype.compile = UnaryExpr_compile;
  // 접미 수식 객체의 컴파일을 수행합니다.
  function PostExpr_compile(dataseg, codeseg, identifierDict) {
    var exprTokenList = this.expressionTokenList;
    
    // 접미 수식은 기본 수식과 기타 연산자의 리스트입니다.
    for (var i=0, len=exprTokenList.length; i<len; ++i) {
      var token = exprTokenList[i]; // 토큰을 획득합니다.
      
      // 기본 수식이 발견되면 컴파일 한 다음 반복문을 종료합니다.
      // 이러한 처리는 완전하지 않은 것입니다.
      if (token instanceof PrimaryExpression) {
        token.compile(dataseg, codeseg, identifierDict);
        break;
      }
    }
  }
  PostfixExpression.prototype.compile = PostExpr_compile;
  // 기본 수식 객체의 컴파일을 수행합니다.
  function PrimaryExpr_compile(dataseg, codeseg, identifierDict) {
    // 기본 수식의 4번 정의에 해당하는 경우의 처리입니다.
    if (this.value instanceof ExpressionInfo) {
      this.value.compile(dataseg, codeseg, identifierDict);
      return;
    }
    
    // 첫 글자를 기준으로 식별자, 상수, 문자열인지 판정합니다.
    var ch = this.value.charAt(0);
    if (is_fnamch(ch)) { // 식별자라면
      // 오프셋을 구합니다.
      var offset = identifierDict[this.value].offset;
      var offsetString = '';
      
      // 0이 아니면 음 또는 양의 값이므로, 부호를 맞춥니다.
      if (offset != 0) {
        offsetString = (offset > 0) ? '+' + offset : offset;
      }
      
      // 구한 오프셋을 이용하여 변수 위치를 획득하는 코드입니다.
      codeseg.writeln('lea ebx, [ebp%s]', offsetString);
      codeseg.writeln('mov eax, [ebx]');
    }
    else if (is_digit(ch)) { // 상수라면 그냥 기록합니다.
      codeseg.writeln('mov eax, %s', this.value);
    }
    else if (ch == '\'' || ch == '\"') { // 직접 작성해보십시오.
      throw new CompilerException('not implemented');
    }
    else { // 그 외의 경우 예외 처리합니다.
      throw new CompilerException
        ('invalid primary expression value');
    }
  }
  PrimaryExpression.prototype.compile = PrimaryExpr_compile;
  
  // 등록
  _Expression.getExpressionInfo = getExpressionInfo;
  compiler.Expression = _Expression;
}