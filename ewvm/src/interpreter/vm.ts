import { Instruction } from '../common/instruction.js'
import {
  RootSyntaxNode,
  InstructionSyntaxNode,
  LabelDeclarationSyntaxNode,
  IntLiteralSyntaxNode,
  FloatLiteralSyntaxNode,
  StringLiteralSyntaxNode,
  LabelSyntaxNode,
} from '../syntax/tree.js'

// ============================================================================
// VM Values
// ============================================================================

export abstract class VMValue {
  public abstract toPrimitive(): number | string

  public isInt(): this is VMInt {
    return false
  }

  public isFloat(): this is VMFloat {
    return false
  }

  public isNumber(): this is VMInt | VMFloat {
    return false
  }

  public isStringRef(): this is VMStringRef {
    return false
  }

  public isStackRef(): this is VMStackRef {
    return false
  }

  public isStructRef(): this is VMStructRef {
    return false
  }

  public isCodeRef(): this is VMCodeRef {
    return false
  }

  public isAddress(): this is VMStackRef | VMStructRef {
    return false
  }

  public static from(val: unknown): VMValue {
    if (val instanceof VMValue) return val
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return new VMInt(val)
      return new VMFloat(val)
    }
    if (typeof val === 'string') {
      const parts = val.split('#')
      const type = parts[0]
      if (type === 'string' && parts[1] !== undefined) {
        return new VMStringRef(parseInt(parts[1], 10))
      }
      if (type === 'stack' && parts[1] !== undefined) {
        return new VMStackRef(parseInt(parts[1], 10))
      }
      if (type === 'code' && parts[1] !== undefined) {
        return new VMCodeRef(parseInt(parts[1], 10))
      }
      if (type === 'struct' && parts[1] !== undefined && parts[2] !== undefined) {
        return new VMStructRef(parseInt(parts[1], 10), parseInt(parts[2], 10))
      }
    }
    throw new Error(`Cannot box value: ${val}`)
  }
}

export class VMInt extends VMValue {
  constructor(public readonly value: number) {
    super()
  }

  public override isInt(): this is VMInt {
    return true
  }

  public override isNumber(): this is VMInt | VMFloat {
    return true
  }

  public override toPrimitive(): number {
    return this.value
  }
}

export class VMFloat extends VMValue {
  constructor(public readonly value: number) {
    super()
  }

  public override isFloat(): this is VMFloat {
    return true
  }

  public override isNumber(): this is VMInt | VMFloat {
    return true
  }

  public override toPrimitive(): number {
    return this.value
  }
}

export class VMStringRef extends VMValue {
  constructor(public readonly index: number) {
    super()
  }

  public override isStringRef(): this is VMStringRef {
    return true
  }

  public override toPrimitive(): string {
    return `string#${this.index}`
  }
}

export class VMStackRef extends VMValue {
  constructor(public readonly index: number) {
    super()
  }

  public override isStackRef(): this is VMStackRef {
    return true
  }

  public override isAddress(): this is VMStackRef | VMStructRef {
    return true
  }

  public override toPrimitive(): string {
    return `stack#${this.index}`
  }
}

export class VMStructRef extends VMValue {
  constructor(
    public readonly heapIndex: number,
    public readonly offset: number
  ) {
    super()
  }

  public override isStructRef(): this is VMStructRef {
    return true
  }

  public override isAddress(): this is VMStackRef | VMStructRef {
    return true
  }

  public withOffset(newOffset: number): VMStructRef {
    return new VMStructRef(this.heapIndex, newOffset)
  }

  public override toPrimitive(): string {
    return `struct#${this.heapIndex}#${this.offset}`
  }
}

export class VMCodeRef extends VMValue {
  constructor(public readonly targetIndex: number) {
    super()
  }

  public override isCodeRef(): this is VMCodeRef {
    return true
  }

  public override toPrimitive(): string {
    return `code#${this.targetIndex}`
  }
}

// ============================================================================
// Executable Program & Instruction Representation
// ============================================================================

export interface ExecutableInstruction {
  readonly line: number
  readonly instruction: Instruction
  readonly arg0?: number | string | undefined
  readonly arg1?: number | undefined
}

export class VMProgram {
  constructor(
    public readonly instructions: ReadonlyArray<ExecutableInstruction>,
    public readonly labelMap: ReadonlyMap<string, number>
  ) {}

  public static fromRoot(root: RootSyntaxNode, source?: string): VMProgram {
    const rawInstructions: Array<{
      line: number
      instruction: Instruction
      node: InstructionSyntaxNode
      rawArg0?: unknown | undefined
      rawArg1?: unknown | undefined
      labelArg?: string | undefined
    }> = []

    const labelMap = new Map<string, number>()

    const getLine = (pos: number): number => {
      if (!source) return 1
      let line = 1
      for (let i = 0; i < pos && i < source.length; i++) {
        if (source.charCodeAt(i) === 10) line++
      }
      return line
    }

    for (const stmt of root.statements.elements) {
      if (stmt instanceof LabelDeclarationSyntaxNode) {
        labelMap.set(stmt.name, rawInstructions.length)
        labelMap.set(stmt.name.toLowerCase(), rawInstructions.length)
      } else if (stmt instanceof InstructionSyntaxNode) {
        const line = getLine(stmt.instructionToken.span.position)
        let rawArg0: unknown = undefined
        let rawArg1: unknown = undefined
        let labelArg: string | undefined = undefined

        if (stmt.args && stmt.args.elements.length > 0) {
          const first = stmt.args.elements[0]!
          if (first instanceof IntLiteralSyntaxNode || first instanceof FloatLiteralSyntaxNode) {
            rawArg0 = first.value
          } else if (first instanceof StringLiteralSyntaxNode) {
            rawArg0 = first.value
          } else if (first instanceof LabelSyntaxNode) {
            labelArg = first.name
          }

          if (stmt.args.elements.length > 1) {
            const second = stmt.args.elements[1]!
            if (second instanceof IntLiteralSyntaxNode || second instanceof FloatLiteralSyntaxNode) {
              rawArg1 = second.value
            }
          }
        }

        rawInstructions.push({
          line,
          instruction: stmt.instruction,
          node: stmt,
          rawArg0,
          rawArg1,
          labelArg,
        })
      }
    }

    const instructions: ExecutableInstruction[] = rawInstructions.map((item) => {
      let arg0: number | string | undefined = undefined
      if (item.labelArg !== undefined) {
        const target = labelMap.get(item.labelArg) ?? labelMap.get(item.labelArg.toLowerCase()) ?? 0
        arg0 = `code#${target}`
      } else if (typeof item.rawArg0 === 'number' || typeof item.rawArg0 === 'string') {
        arg0 = item.rawArg0
      }

      const arg1 = typeof item.rawArg1 === 'number' ? item.rawArg1 : undefined
      return {
        line: item.line,
        instruction: item.instruction,
        arg0,
        arg1,
      }
    })

    return new VMProgram(instructions, labelMap)
  }
}

// ============================================================================
// Virtual Machine Interpreter
// ============================================================================

export type VMAnimationStep = [
  line: number,
  operandStack: (number | string)[],
  callStack: [number, number][],
  stringHeap: string[],
  structHeap: unknown[],
  framePointer: number,
  terminalIndex: [number, number],
]

export type VMExecutionResult = [
  read: number,
  result: string[] | string,
  pointerCode: number,
  callStack: [number, number][],
  operandStack: (number | string)[],
  framePointer: number,
  stringHeap: string[],
  structHeap: unknown[],
  animation: VMAnimationStep[],
]

export class VirtualMachine {
  private operandStack: VMValue[] = []
  private callStack: [number, number][] = []
  private stringHeap: string[] = []
  private structHeap: unknown[] = []
  private framePointer: number = 0
  private pointerCode: number = 0
  private animation: VMAnimationStep[] = []
  private result: string[] = []

  public static isNumber(x: unknown): boolean {
    return typeof x === 'number'
  }

  public static isString(x: unknown): boolean {
    return typeof x === 'string'
  }

  public static toRef(type: string, x: string | number): string {
    return `${type}#${x}`
  }

  public static changeStructRefIndex(x: string, index: number): string {
    const ref = x.split('#')
    ref[2] = index.toString()
    return ref.join('#')
  }

  public static getRef(x: unknown): [string, ...number[]] | [0] {
    if (typeof x !== 'string') return [0]
    const ref = x.split('#')
    const type = ref[0]!
    if (type === 'struct') return [type, parseInt(ref[1]!, 10), parseInt(ref[2]!, 10)]
    if (type === 'stack' || type === 'code' || type === 'string') return [type, parseInt(ref[1]!, 10)]
    return [0]
  }

  public static putString(stringHeap: string[], x: string): string {
    stringHeap.push(x.substring(0, 100))
    return VirtualMachine.toRef('string', stringHeap.length - 1)
  }

  public static putStruct(structHeap: unknown[], x: unknown[]): string {
    structHeap.push(x)
    return VirtualMachine.toRef('struct', `${structHeap.length - 1}#0`)
  }

  public static animationError(animation: VMAnimationStep[]): void {
    for (let i = 0; i < animation.length - 1; i++) {
      animation[i]![6] = [-1, 0]
    }
    if (animation.length > 0) {
      animation[animation.length - 1]![6] = [0, 1]
    }
  }

  public run(
    input: string | null,
    code: VMProgram | RootSyntaxNode | unknown[],
    pointerCode: number = 0,
    callStack: [number, number][] = [],
    operandStack: (number | string | VMValue)[] = [],
    framePointer: number = 0,
    stringHeap: string[] = [],
    structHeap: unknown[] = [],
    animation: VMAnimationStep[] = [],
    terminalLength: number = -1
  ): VMExecutionResult {
    // Resolve program
    let program: VMProgram
    if (code instanceof VMProgram) {
      program = code
    } else if (code instanceof RootSyntaxNode) {
      program = VMProgram.fromRoot(code)
    } else {
      throw new Error('Unsupported code format for VirtualMachine')
    }

    const instructions = program.instructions
    this.stringHeap = stringHeap
    this.structHeap = structHeap
    this.framePointer = framePointer
    this.callStack = callStack
    this.animation = animation
    this.result = []
    this.operandStack = operandStack.map((v) => (v instanceof VMValue ? v : VMValue.from(v)))

    let stop = 0
    let error = ''
    let read = 0
    let fpInitialized = -1
    let nrInstructions = 0
    const maxInstructions = 10000

    this.pointerCode = pointerCode

    // Handle input read resume
    if (input != null) {
      const stringRef = VirtualMachine.putString(this.stringHeap, input)
      this.operandStack.push(VMValue.from(stringRef))
      const lastAnim = this.animation[this.animation.length - 1]
      if (lastAnim) {
        lastAnim[1] = this.exportOperandStack()
        lastAnim[3] = this.stringHeap.slice(0)
        fpInitialized = lastAnim[5]
      }
    }

    for (
      ;
      this.pointerCode < instructions.length && nrInstructions < maxInstructions;
      this.pointerCode++, nrInstructions++
    ) {
      const resultLength = this.result.length
      const c = instructions[this.pointerCode]!

      if (!stop && !read && error === '') {
        const line = c.line
        const instruction = c.instruction

        switch (instruction) {
          case Instruction.STOP:
            stop = 1
            break

          case Instruction.START:
            this.framePointer = this.operandStack.length
            fpInitialized = 1
            break

          case Instruction.ADD: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(m.value + n.value))
              } else {
                error = 'Illegal Operand: add - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: add - elements missing'
            }
            break
          }

          case Instruction.SUB: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(m.value - n.value))
              } else {
                error = 'Illegal Operand: sub - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: sub - elements missing'
            }
            break
          }

          case Instruction.MUL: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(m.value * n.value))
              } else {
                error = 'Illegal Operand: mul - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: mul - elements missing'
            }
            break
          }

          case Instruction.DIV: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && n.value === 0) {
                error = 'Division By Zero: div'
              } else if (n.isInt() && m.isInt()) {
                this.push(new VMInt((m.value / n.value) | 0))
              } else {
                error = 'Illegal Operand: div - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: div - elements missing'
            }
            break
          }

          case Instruction.MOD: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(m.value % n.value))
              } else {
                error = 'Illegal Operand: mod - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: mod - elements missing'
            }
            break
          }

          case Instruction.NOT: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isInt()) {
                this.push(new VMInt(n.value === 0 ? 1 : 0))
              } else {
                error = 'Illegal Operand: not - element not Integer'
              }
            } else {
              error = 'Segmentation Fault: not - elements missing'
            }
            break
          }

          case Instruction.INF: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(m.value < n.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: inf - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: inf - elements missing'
            }
            break
          }

          case Instruction.INFEQ: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(m.value <= n.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: infeq - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: infeq - elements missing'
            }
            break
          }

          case Instruction.SUP: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(m.value > n.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: sup - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: sup - elements missing'
            }
            break
          }

          case Instruction.SUPEQ: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(m.value >= n.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: supeq - elements not Integer'
              }
            } else {
              error = 'Segmentation Fault: supeq - elements missing'
            }
            break
          }

          case Instruction.FADD: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isFloat() && m.isFloat()) {
                this.push(new VMFloat(m.value + n.value))
              } else {
                error = 'Illegal Operand: fadd - elements not Real Number'
              }
            } else {
              error = 'Segmentation Fault: fadd - elements missing'
            }
            break
          }

          case Instruction.FSUB: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isFloat() && m.isFloat()) {
                this.push(new VMFloat(m.value - n.value))
              } else {
                error = 'Illegal Operand: fsub - elements not Real Number'
              }
            } else {
              error = 'Segmentation Fault: fsub - elements missing'
            }
            break
          }

          case Instruction.FMUL: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isFloat() && m.isFloat()) {
                this.push(new VMFloat(m.value * n.value))
              } else {
                error = 'Illegal Operand: fmul - elements not Real Number'
              }
            } else {
              error = 'Segmentation Fault: fmul - elements missing'
            }
            break
          }

          case Instruction.FDIV: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isFloat() && m.isFloat()) {
                this.push(new VMFloat(m.value / n.value))
              } else {
                error = 'Illegal Operand: fdiv - elements not Real Number'
              }
            } else {
              error = 'Segmentation Fault: div - elements missing'
            }
            break
          }

          case Instruction.FCOS: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isFloat()) {
                this.push(new VMFloat(Math.cos(n.value)))
              } else {
                error = 'Illegal Operand: fcos - element not Real Number'
              }
            } else {
              error = 'Segmentation Fault: fcos - elements missing'
            }
            break
          }

          case Instruction.FSIN: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isFloat()) {
                this.push(new VMFloat(Math.sin(n.value)))
              } else {
                error = 'Illegal Operand: fsin - element not Real Number'
              }
            } else {
              error = 'Segmentation Fault: fsin - elements missing'
            }
            break
          }

          case Instruction.FINF: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isFloat() && m.isFloat()) {
                this.push(new VMInt(m.value < n.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: finf - elements not Real Number'
              }
            } else {
              error = 'Segmentation Fault: finf - elements missing'
            }
            break
          }

          case Instruction.FINFEQ: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isFloat() && m.isFloat()) {
                this.push(new VMInt(m.value <= n.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: finfeq - elements not Real Number'
              }
            } else {
              error = 'Segmentation Fault: finfeq - elements missing'
            }
            break
          }

          case Instruction.FSUP: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isFloat() && m.isFloat()) {
                this.push(new VMInt(m.value > n.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: fsup - elements not Real Number'
              }
            } else {
              error = 'Segmentation Fault: fsup - elements missing'
            }
            break
          }

          case Instruction.FSUPEQ: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isFloat() && m.isFloat()) {
                this.push(new VMInt(m.value >= n.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: fsupeq - elements not Real Number'
              }
            } else {
              error = 'Segmentation Fault: fsupeq - elements missing'
            }
            break
          }

          case Instruction.CONCAT: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const s1 = this.pop()
              const s2 = this.pop()
              if (s1.isStringRef() && s2.isStringRef()) {
                const str1 = this.stringHeap[s1.index] ?? '' // TODO
                const str2 = this.stringHeap[s2.index] ?? '' // TODO
                const combined = str1.concat(str2)
                const ref = VirtualMachine.putString(this.stringHeap, combined)
                this.push(VMValue.from(ref))
              } else {
                error = 'Illegal Operand: concat - elements not String'
              }
            } else {
              error = 'Segmentation Fault: concat - elements missing'
            }
            break
          }

          case Instruction.EQUAL: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop().toPrimitive()
              const m = this.pop().toPrimitive()
              this.push(new VMInt(m == n ? 1 : 0))
            } else {
              error = 'Segmentation Fault: equal - elements missing'
            }
            break
          }

          case Instruction.ATOI: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const s = this.pop()
              if (s.isStringRef()) {
                const str = this.stringHeap[s.index] ?? ''
                const i = parseInt(str, 10)
                if (Number.isInteger(i)) {
                  this.push(new VMInt(i))
                } else {
                  error = 'Illegal Operand: atoi - String does not represent Integer'
                }
              } else {
                error = 'Illegal Operand: atoi - element not String Reference'
              }
            } else {
              error = 'Segmentation Fault: atoi - elements missing'
            }
            break
          }

          case Instruction.ATOF: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const s = this.pop()
              if (s.isStringRef()) {
                const str = this.stringHeap[s.index] ?? ''
                const i = parseFloat(str)
                if (!Number.isNaN(i)) {
                  this.push(new VMFloat(i))
                } else {
                  error = 'Illegal Operand: atof - String does not represent Real Number'
                }
              } else {
                error = 'Illegal Operand: atof - element not String Reference'
              }
            } else {
              error = 'Segmentation Fault: atof - elements missing'
            }
            break
          }

          case Instruction.ITOF: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isInt()) {
                this.push(new VMFloat(n.value))
              } else {
                error = 'Illegal Operand: itof - element not Integer'
              }
            } else {
              error = 'Segmentation Fault: itof - elements missing'
            }
            break
          }

          case Instruction.FTOI: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isFloat()) {
                this.push(new VMInt(parseInt(n.value.toString(), 10)))
              } else {
                error = 'Illegal Operand: ftoi - element not Real Number'
              }
            } else {
              error = 'Segmentation Fault: ftoi - elements missing'
            }
            break
          }

          case Instruction.STRI: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isInt()) {
                const ref = VirtualMachine.putString(this.stringHeap, n.value.toString())
                this.push(VMValue.from(ref))
              } else {
                error = 'Illegal Operand: stri - element not Integer'
              }
            } else {
              error = 'Segmentation Fault: stri - elements missing'
            }
            break
          }

          case Instruction.STRF: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isFloat()) {
                const ref = VirtualMachine.putString(this.stringHeap, n.value.toString())
                this.push(VMValue.from(ref))
              } else {
                error = 'Illegal Operand: strf - element not Real Number'
              }
            } else {
              error = 'Segmentation Fault: strf - elements missing'
            }
            break
          }

          case Instruction.PUSHSP:
            this.push(new VMStackRef(this.operandStack.length - 1))
            break

          case Instruction.PUSHFP:
            this.push(new VMStackRef(this.framePointer))
            break

          case Instruction.PUSHGP:
            this.push(new VMStackRef(0))
            break

          case Instruction.LOADN: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const a = this.pop()
              if (!n.isInt()) {
                error = 'Illegal Operand: loadn - element not Integer'
              } else if (a.isStackRef()) {
                const targetVal = this.operandStack[a.index + n.value]
                if (targetVal !== undefined) {
                  this.push(targetVal)
                } else {
                  error = 'Segmentation Fault: loadn - elements missing'
                }
              } else if (a.isStructRef()) {
                const struct = this.structHeap[a.heapIndex] as unknown[] | undefined
                const index = a.offset + n.value
                if (struct && struct.length > index && index >= 0) {
                  this.push(VMValue.from(struct[index]))
                } else {
                  error = 'Segmentation Fault: loadn - index out of Struct'
                }
              } else {
                error = 'Illegal Operand: loadn - element not Address'
              }
            } else {
              error = 'Segmentation Fault: loadn - elements missing'
            }
            break
          }

          case Instruction.STOREN: {
            if (this.operandStack.length >= this.framePointer + 3) {
              const v = this.pop()
              const n = this.pop()
              const a = this.pop()
              if (v.isStackRef() || v.isCodeRef() || v.isStructRef()) {
                error = 'Illegal Operand: storen - element not Integer, Float or String'
              } else if (!n.isInt()) {
                error = 'Illegal Operand: storen - element not Integer'
              } else if (a.isStackRef()) {
                this.operandStack[a.index + n.value] = v
              } else if (a.isStructRef()) {
                const struct = this.structHeap[a.heapIndex] as unknown[] | undefined
                const index = a.offset + n.value
                if (struct && struct.length > index && index >= 0) {
                  struct[index] = v.toPrimitive()
                } else {
                  error = 'Segmentation Fault: storen - index out of Struct'
                }
              } else {
                error = 'Illegal Operand: storen - element not Address'
              }
            } else {
              error = 'Segmentation Fault: storen - elements missing'
            }
            break
          }

          case Instruction.SWAP: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              this.push(n)
              this.push(m)
            } else {
              error = 'Segmentation Fault: swap - elements missing'
            }
            break
          }

          case Instruction.WRITEI: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isInt()) {
                this.result.push(n.value.toString())
              } else {
                error = 'Illegal Operand: writei - element not Integer'
              }
            } else {
              error = 'Segmentation Fault: writei - elements missing'
            }
            break
          }

          case Instruction.WRITEF: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isFloat()) {
                this.result.push(n.value.toString())
              } else {
                error = 'Illegal Operand: writef - element not Real Number'
              }
            } else {
              error = 'Segmentation Fault: writef - elements missing'
            }
            break
          }

          case Instruction.WRITES: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isStringRef()) {
                this.result.push(this.stringHeap[n.index] ?? '')
              } else {
                error = 'Illegal Operand: writes - element not String Reference'
              }
            } else {
              error = 'Segmentation Fault: writes - elements missing'
            }
            break
          }

          case Instruction.READ:
            // TODO when moving to front open a text box and questin user
            read = 1
            break

          case Instruction.CALL: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const ref = this.pop()
              if (ref.isCodeRef()) {
                this.callStack.push([this.pointerCode, this.framePointer])
                this.pointerCode = ref.targetIndex - 1
                this.framePointer = this.operandStack.length
                fpInitialized = 1
              } else {
                error = 'Illegal Operand: call - element not Label'
              }
            } else {
              error = 'Segmentation Fault: call - elements missing'
            }
            break
          }

          case Instruction.RETURN: {
            if (this.callStack.length >= 1) {
              const called = this.callStack.pop()!
              this.pointerCode = called[0]
              this.framePointer = called[1]
              fpInitialized = 1
            } else {
              error = 'Segmentation Fault: return - elements missing'
            }
            break
          }

          case Instruction.ALLOCN: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isInt()) {
                const struct = new Array(n.value)
                const ref = VirtualMachine.putStruct(this.structHeap, struct)
                this.push(VMValue.from(ref))
              } else {
                error = 'Illegal Operand: allocn - element not Integer'
              }
            } else {
              error = 'Segmentation Fault: allocn - elements missing'
            }
            break
          }

          case Instruction.FREE: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const a = this.pop().toPrimitive()
              if (Array.isArray(a)) {
                // no-op
              } else if (a == null) {
                error = 'Illegal Operand: free - element null'
              } else {
                error = 'Illegal Operand: free - element not Struct Address'
              }
            } else {
              error = 'Segmentation Fault: free - elements missing'
            }
            break
          }

          case Instruction.DUPN: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const v = this.pop()
              if (n.isInt()) {
                for (let i = 0; i < n.value; i++) {
                  this.push(v)
                }
              } else {
                error = 'Illegal Operand: dupn - element not Integer'
              }
            } else {
              error = 'Segmentation Fault: dupn - elements missing'
            }
            break
          }

          case Instruction.POPN: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isInt()) {
                if (this.operandStack.length >= this.framePointer + n.value) {
                  for (let i = 0; i < n.value; i++) {
                    this.pop()
                  }
                } else {
                  error = 'Segmentation Fault: popn - elements missing'
                }
              } else {
                error = 'Illegal Operand: popn - elements missing'
              }
            } else {
              error = 'Segmentation Fault: popn - elements missing'
            }
            break
          }

          case Instruction.PADD: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const a = this.pop()
              if (!n.isInt()) {
                error = 'Illegal Operand: padd - element not Integer'
              } else if (a.isStackRef()) {
                this.push(new VMStackRef(a.index + n.value))
              } else if (a.isStructRef()) {
                const struct = this.structHeap[a.heapIndex] as unknown[] | undefined
                const index = a.offset + n.value
                if (struct && struct.length > index && index >= 0) {
                  this.push(a.withOffset(index))
                } else {
                  error = 'Segmentation Fault: padd - index out of Struct'
                }
              } else {
                error = 'Illegal Operand: padd - element not Address'
              }
            } else {
              error = 'Segmentation Fault: padd - elements missing'
            }
            break
          }

          case Instruction.PUSHI:
            this.push(new VMInt(c.arg0 as number)) // TODO cleanup the wholke of this messy code... who wrote this??
            break

          case Instruction.PUSHN: {
            const count = c.arg0 as number
            for (let i = 0; i < count; i++) {
              this.push(new VMInt(0))
            }
            break
          }

          case Instruction.PUSHG: {
            const idx = c.arg0 as number
            if (this.operandStack.length >= idx) {
              const val = this.operandStack[idx]
              if (val !== undefined) {
                this.push(val)
              } else {
                error = 'Segmentation Fault: pushg - elements missing'
              }
            } else {
              error = 'Segmentation Fault: pushg - elements missing'
            }
            break
          }

          case Instruction.PUSHL: {
            const idx = c.arg0 as number
            if (this.operandStack.length >= this.framePointer + idx) {
              const val = this.operandStack[this.framePointer + idx]
              if (val !== undefined) {
                this.push(val)
              } else {
                error = 'Segmentation Fault: pushg - elements missing'
              }
            } else {
              error = 'Segmentation Fault: pushg - elements missing'
            }
            break
          }

          case Instruction.LOAD: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const a = this.pop()
              const offset = c.arg0 as number
              if (a.isStackRef()) {
                const val = this.operandStack[a.index + offset]
                if (val !== undefined) {
                  this.push(val)
                } else {
                  error = 'Segmentation Fault: load - elements missing'
                }
              } else if (a.isStructRef()) {
                const struct = this.structHeap[a.heapIndex] as unknown[] | undefined
                const index = a.offset + offset
                if (struct && struct.length > index) {
                  this.push(VMValue.from(struct[index]))
                } else {
                  error = 'Segmentation Fault: load - index out of Struct'
                }
              } else {
                error = 'Illegal Operand: load - element not Address'
              }
            } else {
              error = 'Segmentation Fault: load - elements missing'
            }
            break
          }

          case Instruction.DUP: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const v = this.pop()
              const count = c.arg0 as number
              for (let i = 0; i < count; i++) {
                this.push(v)
              }
            } else {
              error = 'Segmentation Fault: dup - elements missing'
            }
            break
          }

          case Instruction.POP: {
            const count = c.arg0 as number
            if (this.operandStack.length >= this.framePointer + count) {
              for (let i = 0; i < count; i++) {
                this.pop()
              }
            } else {
              error = 'Segmentation Fault: pop - elements missing'
            }
            break
          }

          case Instruction.STOREL: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const v = this.pop()
              const offset = c.arg0 as number
              this.operandStack[this.framePointer + offset] = v
            } else {
              error = 'Segmentation Fault: storel - elements missing'
            }
            break
          }

          case Instruction.STOREG: {
            if (this.operandStack.length >= framePointer + 1) {
              const v = this.pop()
              const idx = c.arg0 as number
              this.operandStack[idx] = v
            } else {
              error = 'Segmentation Fault: storeg - elements missing'
            }
            break
          }

          case Instruction.STORE: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const v = this.pop()
              const a = this.pop()
              const offset = c.arg0 as number
              if (a.isStackRef()) {
                this.operandStack[a.index + offset] = v
              } else if (a.isStructRef()) {
                const struct = this.structHeap[a.heapIndex] as unknown[] | undefined
                const index = a.offset + offset
                if (struct && struct.length > index) {
                  struct[index] = v.toPrimitive()
                } else {
                  error = 'Segmentation Fault: store - index out of Struct'
                }
              } else {
                error = 'Illegal Operand: store - element not Address'
              }
            } else {
              error = 'Segmentation Fault: store - elements missing'
            }
            break
          }

          case Instruction.ALLOC: {
            const size = c.arg0 as number
            const struct = new Array(size)
            const ref = VirtualMachine.putStruct(this.structHeap, struct)
            this.push(VMValue.from(ref))
            break
          }

          case Instruction.PUSHF:
            this.push(new VMFloat(c.arg0 as number))
            break

          case Instruction.PUSHS: {
            const ref = VirtualMachine.putString(this.stringHeap, c.arg0 as string)
            this.push(VMValue.from(ref))
            break
          }

          case Instruction.ERR:
            error = `Error: ${c.arg0}`
            break

          case Instruction.CHECK: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const v = this.pop()
              this.push(v)
              const min = c.arg0 as number
              const max = c.arg1 as number
              const valNum = v.toPrimitive()
              if (typeof valNum !== 'number' || !(min <= valNum && valNum <= max)) {
                error = 'Illegal Operand: check - element not between given values'
              }
            } else {
              error = 'Segmentation Fault: check - elements missing'
            }
            break
          }

          case Instruction.JUMP: {
            const ref = VMValue.from(c.arg0)
            if (ref.isCodeRef()) {
              this.pointerCode = ref.targetIndex - 1
            }
            break
          }

          case Instruction.JZ: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const top = this.pop()
              if (top.toPrimitive() === 0) {
                const ref = VMValue.from(c.arg0)
                if (ref.isCodeRef()) {
                  this.pointerCode = ref.targetIndex - 1
                }
              }
            } else {
              error = 'Segmentation Fault: jz - elements missing'
            }
            break
          }

          case Instruction.PUSHA:
            this.push(VMValue.from(c.arg0)) // TODO
            break

          case Instruction.NOP:
            break

          case Instruction.WRITELN:
            this.result.push('\n') // lol, I added \n to the string parsing...
            break

          case Instruction.AND: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) { // TODO should probably add a float vm value
                this.push(new VMInt(n.value && m.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: and - element not Number'
              }
            } else {
              error = 'Segmentation Fault: and - elements missing'
            }
            break
          }

          case Instruction.OR: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isInt() && m.isInt()) {
                this.push(new VMInt(n.value || m.value ? 1 : 0))
              } else {
                error = 'Illegal Operand: or - element not Number'
              }
            } else {
              error = 'Segmentation Fault: or - elements missing'
            }
            break
          }

          case Instruction.CHRCODE: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isStringRef()) {
                const str = this.stringHeap[n.index] ?? ''
                if (str.length > 0) {
                  this.push(new VMInt(str.charCodeAt(0)))
                } else {
                  error = 'Illegal Operand: chrcode - empty String'
                }
              } else {
                error = 'Illegal Operand: chrcode - element not String Reference'
              }
            } else {
              error = 'Segmentation Fault: chrcode - elements missing'
            }
            break
          }

          case Instruction.WRITECHR: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isInt()) {
                this.result.push(String.fromCharCode(n.value))
              } else {
                error = 'Illegal Operand: writechr - element not Integer'
              }
            } else {
              error = 'Segmentation Fault: writechr - elements missing'
            }
            break
          }

          case Instruction.STRLEN: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isStringRef()) {
                const str = this.stringHeap[n.index] ?? ''
                this.push(new VMInt(str.length))
              } else {
                error = 'Illegal Operand: strlen - element not String Reference'
              }
            } else {
              error = 'Segmentation Fault: strlen - elements missing'
            }
            break
          }

          case Instruction.CHARAT: {
            if (this.operandStack.length >= this.framePointer + 2) {
              const n = this.pop()
              const m = this.pop()
              if (n.isNumber() && m.isStringRef()) {
                const str = this.stringHeap[m.index] ?? ''
                const idx = n.value
                if (str.length > idx && idx >= 0) {
                  this.push(new VMInt(str.charCodeAt(idx)))
                } else {
                  error = 'Segmentation Fault:  - elements missing (string too short)'
                }
              } else {
                error = 'Illegal Operand: charat - elements not Number and String Reference'
              }
            } else {
              error = 'Segmentation Fault:  - elements missing'
            }
            break
          }

          case Instruction.PUSHST: {
            const n = c.arg0 as number
            if (n < this.structHeap.length) {
              this.push(new VMStructRef(n, 0))
            } else {
              error = 'Illegal Operand: pushst - index out of range of Struct Heap'
            }
            break
          }

          case Instruction.POPST: {
            if (this.structHeap.length >= 1) {
              this.structHeap.pop()
            } else {
              error = 'Segmentation Fault: popst - elements missing'
            }
            break
          }

          case Instruction.COPYN: {
            if (this.operandStack.length >= this.framePointer + 1) {
              const n = this.pop()
              if (n.isInt()) {
                if (this.operandStack.length >= this.framePointer + n.value) {
                  const values: VMValue[] = []
                  for (let i = 0; i < n.value; i++) {
                    values.push(this.pop())
                  }
                  const duplicated = [...values, ...values]
                  for (let i = duplicated.length - 1; i >= 0; i--) {
                    this.push(duplicated[i]!)
                  }
                } else {
                  error = 'Segmentation Fault: copyn - elements missing'
                }
              } else {
                error = 'Segmentation Fault: copyn - elements missing'
              }
            } else {
              error = 'Segmentation Fault: copyn - elements missing'
            }
            break
          }

          case Instruction.COPY: {
            const count = c.arg0 as number
            if (this.operandStack.length >= this.framePointer + count) {
              const values: VMValue[] = []
              for (let i = 0; i < count; i++) {
                values.push(this.pop())
              }
              const duplicated = [...values, ...values]
              for (let i = duplicated.length - 1; i >= 0; i--) {
                this.push(duplicated[i]!)
              }
            } else {
              error = 'Segmentation Fault: copy - elements missing'
            }
            break
          }

          default:
            error = 'Anomaly: Default case'
        }

        let fpointer = -1
        if (fpInitialized > -1 || this.framePointer !== 0) fpointer = this.framePointer
        const termIdx: [number, number] = [
          terminalLength + this.result.length,
          this.result.length - resultLength,
        ]

        // TODO After moving this to the frontend, let's cleanup this and do it correctly, not ahead of time... that is for TTD and we can do better in terms of memory usage...
        this.animation.push([
          line,
          this.exportOperandStack(),
          this.callStack.slice(0),
          this.stringHeap.slice(0),
          this.structHeap.slice(0),
          fpointer,
          termIdx,
        ])
      } else {
        break
      }
    }

    if (nrInstructions >= maxInstructions) {
      error = `ERROR: Max instructions reached (${maxInstructions}). Step-by-step will be limited to 200 iterations. Possible cause: infinite loop.`
    }

    if (error !== '') {
      VirtualMachine.animationError(this.animation)
      this.animation = this.animation.slice(0, 200)
      return [
        0,
        error,
        this.pointerCode,
        this.callStack,
        this.exportOperandStack(),
        this.framePointer,
        this.stringHeap,
        this.structHeap,
        this.animation,
      ]
    }

    return [
      read,
      this.result,
      this.pointerCode,
      this.callStack,
      this.exportOperandStack(),
      this.framePointer,
      this.stringHeap,
      this.structHeap,
      this.animation,
    ]
  }

  private push(val: VMValue): void {
    this.operandStack.push(val)
  }

  private pop(): VMValue {
    return this.operandStack.pop()!
  }

  private exportOperandStack(): (number | string)[] {
    return this.operandStack.map((v) => v.toPrimitive())
  }
}
