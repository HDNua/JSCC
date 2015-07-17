/**
JSCC의 실행을 담당하는 가상 기계를 생성합니다.
*/
function initMachine() {
  var machine = {};
  
  initMachineSystem(machine);
  initMachineMemory(machine);
  initMachineProcessor(machine);
  initMachineOperation(machine);
  
  window.Machine = machine;
}