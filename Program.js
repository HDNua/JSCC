/**
JSCC 및 그 테스트 모듈을 관리하는 Program을 생성합니다.
*/
function initProgram() {
  var program = {};
  initProgramStream(program);
  initProgramRunner(program);
  initProgramLinker(program);
  initProgramCompiler(program);
  
  // 필드
  program.status = [];
  program.statusIndex = 0;
  
  // 프로그램 메서드
  program.run = function() {}
  program.undo = function() {
    if (Program.statusIndex > 0) {
      --Program.statusIndex;
      Program.show();
    }
  }
  program.redo = function() {
    if (Program.statusIndex < Program.status.length) {
      ++Program.statusIndex;
      Program.show();
    }
  }
  program.show = function() {
    Program.Stream.mem.clear();
    Program.Stream.exp.clear();
    Program.Stream.reg.clear();
    
    Program.Stream.reg.write(Program.status[Program.statusIndex].reg);
    Program.Stream.mem.write(Program.status[Program.statusIndex].mem);
    Program.Stream.exp.write(Program.status[Program.statusIndex].exp);
  }
  
  // 등록
  window.Program = program;
}