import { VirtualMachine, Parser, VMProgram, DiagnosticSeverity } from 'ewvm';

export interface SessionOutput {
  code: string;
  terminal: string[];
  input: number;
  animation: any[];
  index: number;
}

export class VMSession {
  pointer_code: number = 0;
  call_stack: any[] = [];
  operand_stack: any[] = [];
  frame_pointer: number = 0;
  code_stack: any[] = [];
  program: any = null;
  string_heap: any[] = [];
  struct_heap: any[] = [];
  code: string = '';
  animation: any[] = [];
  result: string[] = [];
  index: number = 0;
  input: number = 0;
  terminal: string[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.pointer_code = 0;
    this.call_stack = [];
    this.operand_stack = [];
    this.frame_pointer = 0;
    this.code_stack = [];
    this.program = null;
    this.string_heap = [];
    this.struct_heap = [];
    this.code = '';
    this.animation = [];
    this.result = [];
    this.index = 0;
    this.input = 0;
    this.terminal = [];
  }

  loadCode(code: string): boolean {
    this.code = code;

    try {
      const root = Parser.parse(code);
      const diagnostics = root.getAllDiagnostics();
      const errors = diagnostics.filter(d => d.id.severity === DiagnosticSeverity.Error);
      if (errors.length > 0) {
        this.result = [`GRAMMAR - ${errors[0].message}`];
        this.animation = ['error'];
        return false;
      }

      this.program = VMProgram.fromRoot(root, code);
      this.code_stack = this.program.instructions;
      return true;
    } catch (error: any) {
      this.result = [`GRAMMAR - ${error?.message ?? error}`];
      this.animation = ['error'];
      return false;
    }
  }

  run(input: any = null): void {
    try {
      const programToRun = this.program ?? this.code_stack;
      const vm = new VirtualMachine();
      const results = vm.run(
        input,
        programToRun,
        this.pointer_code,
        this.call_stack,
        this.operand_stack,
        this.frame_pointer,
        this.string_heap,
        this.struct_heap,
        this.animation,
        this.terminal.length - 1
      );

      this.input = results[0];
      if (Array.isArray(results[1])) {
        this.result = this.terminal.concat(results[1]);
      } else {
        this.result = [results[1]];
      }

      this.pointer_code = results[2];
      this.call_stack = results[3];
      this.operand_stack = results[4];
      this.frame_pointer = results[5];
      this.string_heap = results[6];
      this.struct_heap = results[7];
      this.animation = results[8];
    } catch (e: any) {
      this.result = [`Anomaly: ${e?.message ?? e ?? 'Unknown'}`];
      this.animation = ['error'];
    }
  }

  out(): SessionOutput {
    return {
      code: this.code,
      terminal: this.result,
      input: this.input,
      animation: this.animation,
      index: this.index,
    };
  }

  error(result: string): SessionOutput {
    this.animation = ['error'];
    this.result = [result];
    return this.out();
  }
}
