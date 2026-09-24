import { Instruction } from '../common/instruction.js'
import type { Span } from '../common/text.js'
import type { Diagnostic } from '../common/diagnostic.js'

export enum SyntaxNodeKind {
  Root,
  List,

  LabelDeclaration,
  Instruction,

  String,
  Int,
  Float,
  Label,

  Token,

  CommentTrivia,
  LineBreakTrivia,
  WhitespaceTrivia,
  ErrorTrivia,
}

export enum SyntaxTokenKind {
  // Instructions
  ADD = Instruction.ADD,
  SUB = Instruction.SUB,
  MUL = Instruction.MUL,
  DIV = Instruction.DIV,
  MOD = Instruction.MOD,
  NOT = Instruction.NOT,
  INF = Instruction.INF,
  INFEQ = Instruction.INFEQ,
  SUP = Instruction.SUP,
  SUPEQ = Instruction.SUPEQ,
  FADD = Instruction.FADD,
  FSUB = Instruction.FSUB,
  FMUL = Instruction.FMUL,
  FDIV = Instruction.FDIV,
  FCOS = Instruction.FCOS,
  FSIN = Instruction.FSIN,
  FINF = Instruction.FINF,
  FINFEQ = Instruction.FINFEQ,
  FSUP = Instruction.FSUP,
  FSUPEQ = Instruction.FSUPEQ,
  PADD = Instruction.PADD,
  CONCAT = Instruction.CONCAT,
  CHRCODE = Instruction.CHRCODE,
  STRLEN = Instruction.STRLEN,
  CHARAT = Instruction.CHARAT,
  ALLOC = Instruction.ALLOC,
  ALLOCN = Instruction.ALLOCN,
  FREE = Instruction.FREE,
  POPST = Instruction.POPST,
  EQUAL = Instruction.EQUAL,
  ATOI = Instruction.ATOI,
  ATOF = Instruction.ATOF,
  ITOF = Instruction.ITOF,
  FTOI = Instruction.FTOI,
  STRI = Instruction.STRI,
  STRF = Instruction.STRF,
  PUSHI = Instruction.PUSHI,
  PUSHN = Instruction.PUSHN,
  PUSHF = Instruction.PUSHF,
  PUSHS = Instruction.PUSHS,
  PUSHG = Instruction.PUSHG,
  PUSHL = Instruction.PUSHL,
  PUSHSP = Instruction.PUSHSP,
  PUSHFP = Instruction.PUSHFP,
  PUSHGP = Instruction.PUSHGP,
  PUSHST = Instruction.PUSHST,
  LOAD = Instruction.LOAD,
  LOADN = Instruction.LOADN,
  DUP = Instruction.DUP,
  DUPN = Instruction.DUPN,
  COPY = Instruction.COPY,
  COPYN = Instruction.COPYN,
  POP = Instruction.POP,
  POPN = Instruction.POPN,
  STOREL = Instruction.STOREL,
  STOREG = Instruction.STOREG,
  STORE = Instruction.STORE,
  STOREN = Instruction.STOREN,
  CHECK = Instruction.CHECK,
  SWAP = Instruction.SWAP,
  AND = Instruction.AND,
  OR = Instruction.OR,
  WRITEI = Instruction.WRITEI,
  WRITEF = Instruction.WRITEF,
  WRITES = Instruction.WRITES,
  WRITELN = Instruction.WRITELN,
  WRITECHR = Instruction.WRITECHR,
  READ = Instruction.READ,
  PUSHA = Instruction.PUSHA,
  JUMP = Instruction.JUMP,
  JZ = Instruction.JZ,
  CALL = Instruction.CALL,
  RETURN = Instruction.RETURN,
  START = Instruction.START,
  NOP = Instruction.NOP,
  ERR = Instruction.ERR,
  STOP = Instruction.STOP,

  // Rest
  Colon,

  Inst,
  
  Int,
  Float,
  String,
  Label,
  
  Linebreak,
  Whitespace,
  CommentSemicolon,
  Comment,

  Eos,
}

type MissingFromInstructions = Exclude<keyof typeof Instruction, keyof typeof SyntaxTokenKind>
export const _checkInstructions: MissingFromInstructions extends never ? true : never = true

export abstract class SyntaxNode {
  public abstract readonly kind: SyntaxNodeKind
  public abstract parent?: SyntaxNode
  public abstract readonly isMissing: boolean

  public abstract readonly span: Span

  public get fullSpan(): Span {
    const leading = this.leadingTrivia
    const trailing = this.trailingTrivia
    const start = leading.length > 0 ? leading[0]!.span.position : this.span.position
    const lastTrailing = trailing.length > 0 ? trailing[trailing.length - 1]! : null
    const end = lastTrailing ? lastTrailing.span.position + lastTrailing.span.width : this.span.position + this.span.width
    return { position: start, width: end - start }
  }

  public abstract readonly children: ReadonlyArray<SyntaxNode>

  private static readonly leadingTriviaMap: WeakMap<SyntaxNode, SyntaxTrivia[]> = new WeakMap()
  private static readonly trailingTriviaMap: WeakMap<SyntaxNode, SyntaxTrivia[]> = new WeakMap()

  public get leadingTrivia(): ReadonlyArray<SyntaxTrivia> {
    return SyntaxNode.leadingTriviaMap.get(this) ?? []
  }

  public get trailingTrivia(): ReadonlyArray<SyntaxTrivia> {
    return SyntaxNode.trailingTriviaMap.get(this) ?? []
  }

  public addLeadingTrivia(trivia: SyntaxTrivia): void {
    let list = SyntaxNode.leadingTriviaMap.get(this)
    if (!list) {
      list = []
      SyntaxNode.leadingTriviaMap.set(this, list)
    }
    list.push(trivia)
    trivia.parent = this
  }

  public addTrailingTrivia(trivia: SyntaxTrivia): void {
    let list = SyntaxNode.trailingTriviaMap.get(this)
    if (!list) {
      list = []
      SyntaxNode.trailingTriviaMap.set(this, list)
    }
    list.push(trivia)
    trivia.parent = this
  }

  private static readonly diagnostics: WeakMap<SyntaxNode, Diagnostic[]> = new WeakMap()

  public getDiagnostics(): ReadonlyArray<Diagnostic> {
    return SyntaxNode.diagnostics.get(this) ?? []
  }

  public addDiagnostic(diagnostic: Diagnostic): void {
    let list = SyntaxNode.diagnostics.get(this)
    if (!list) {
      list = []
      SyntaxNode.diagnostics.set(this, list)
    }
    list.push(diagnostic)
  }

  public getAllDiagnostics(): Diagnostic[] {
    const result: Diagnostic[] = [...this.getDiagnostics()]
    for (const trivia of this.leadingTrivia) {
      result.push(...trivia.getAllDiagnostics())
    }
    for (const child of this.children) {
      result.push(...child.getAllDiagnostics())
    }
    for (const trivia of this.trailingTrivia) {
      result.push(...trivia.getAllDiagnostics())
    }
    return result
  }
}

// TODO GENERATED CODE AHEAD, I WILL CLEANUP THIS LATER
export abstract class SyntaxTrivia extends SyntaxNode {
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean = false
  public override readonly children: ReadonlyArray<SyntaxNode> = []
  public abstract readonly text: string
}

export class WhitespaceTriviaSyntaxNode extends SyntaxTrivia {
  public override readonly kind = SyntaxNodeKind.WhitespaceTrivia
  public override readonly span: Span

  constructor(public override readonly text: string, position: number) {
    super()
    this.span = { position, width: text.length }
  }
}

export class LineBreakTriviaSyntaxNode extends SyntaxTrivia {
  public override readonly kind = SyntaxNodeKind.LineBreakTrivia
  public override readonly span: Span

  constructor(public override readonly text: string, position: number) {
    super()
    this.span = { position, width: text.length }
  }
}

export class CommentTriviaSyntaxNode extends SyntaxTrivia {
  public override readonly kind = SyntaxNodeKind.CommentTrivia
  public override readonly isMissing: boolean
  public override readonly span: Span
  public override readonly children: ReadonlyArray<SyntaxNode>
  public override readonly text: string

  constructor(
    public readonly semicolonToken: SyntaxToken,
    public readonly commentToken: SyntaxToken
  ) {
    super()
    semicolonToken.parent = this
    commentToken.parent = this
    this.children = [semicolonToken, commentToken]
    this.isMissing = semicolonToken.isMissing || commentToken.isMissing
    this.text = semicolonToken.text + commentToken.text

    const start = semicolonToken.span.position
    const end = commentToken.span.position + commentToken.span.width
    this.span = { position: start, width: end - start }
  }
}

export class ErrorTriviaSyntaxNode extends SyntaxTrivia {
  public override readonly kind = SyntaxNodeKind.ErrorTrivia
  public override readonly span: Span

  constructor(public override readonly text: string, position: number) {
    super()
    this.span = { position, width: text.length }
  }
}

export class SyntaxToken extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.Token
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean
  public override readonly children: ReadonlyArray<SyntaxNode> = []
  public override readonly span: Span

  constructor(
    public readonly tokenKind: SyntaxTokenKind,
    public readonly text: string,
    position: number,
    leadingTrivia: ReadonlyArray<SyntaxTrivia> = [],
    trailingTrivia: ReadonlyArray<SyntaxTrivia> = [],
    isMissing: boolean = false,
    public readonly value?: unknown
  ) {
    super()
    this.isMissing = isMissing
    this.span = { position, width: text.length }

    for (const t of leadingTrivia) {
      this.addLeadingTrivia(t)
    }
    for (const t of trailingTrivia) {
      this.addTrailingTrivia(t)
    }
  }
}

export class SyntaxList<T extends SyntaxNode> extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.List
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean = false
  public override readonly span: Span
  public override readonly children: ReadonlyArray<T>

  constructor(public readonly elements: ReadonlyArray<T>) {
    super()
    this.children = elements
    for (const el of elements) {
      el.parent = this
    }

    if (elements.length === 0) {
      this.span = { position: 0, width: 0 }
    } else {
      const first = elements[0]!
      const last = elements[elements.length - 1]!
      const start = first.span.position
      const end = last.span.position + last.span.width
      this.span = { position: start, width: end - start }
    }
  }
}

export class SingletonSyntaxList<T extends SyntaxNode> extends SyntaxList<T> {
  public readonly single: T

  constructor(single: T) {
    super([single])
    this.single = single
  }
}

export class IntLiteralSyntaxNode extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.Int
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean
  public override readonly span: Span
  public override readonly children: ReadonlyArray<SyntaxNode>

  constructor(
    public readonly token: SyntaxToken,
    public readonly value: number
  ) {
    super()
    token.parent = this
    this.children = [token]
    this.isMissing = token.isMissing
    this.span = token.span
  }
}

export class FloatLiteralSyntaxNode extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.Float
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean
  public override readonly span: Span
  public override readonly children: ReadonlyArray<SyntaxNode>

  constructor(
    public readonly token: SyntaxToken,
    public readonly value: number
  ) {
    super()
    token.parent = this
    this.children = [token]
    this.isMissing = token.isMissing
    this.span = token.span
  }
}

export class StringLiteralSyntaxNode extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.String
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean
  public override readonly span: Span
  public override readonly children: ReadonlyArray<SyntaxNode>

  constructor(
    public readonly token: SyntaxToken,
    public readonly value: string
  ) {
    super()
    token.parent = this
    this.children = [token]
    this.isMissing = token.isMissing
    this.span = token.span
  }
}

export class LabelSyntaxNode extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.Label
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean
  public override readonly span: Span
  public override readonly children: ReadonlyArray<SyntaxNode>

  constructor(
    public readonly identifierToken: SyntaxToken,
    public readonly name: string
  ) {
    super()
    identifierToken.parent = this
    this.children = [identifierToken]
    this.isMissing = identifierToken.isMissing
    this.span = identifierToken.span
  }
}

export class InstructionSyntaxNode extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.Instruction
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean
  public override readonly span: Span
  public override readonly children: ReadonlyArray<SyntaxNode>

  constructor(
    public readonly instructionToken: SyntaxToken,
    public readonly instruction: Instruction,
    public readonly args: SyntaxList<SyntaxNode> | null
  ) {
    super()
    instructionToken.parent = this
    this.isMissing = instructionToken.isMissing

    if (args) {
      args.parent = this
      this.children = [instructionToken, args]
      const start = instructionToken.span.position
      const end = args.span.position + args.span.width
      this.span = { position: start, width: end - start }
    } else {
      this.children = [instructionToken]
      this.span = instructionToken.span
    }
  }
}

export class LabelDeclarationSyntaxNode extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.LabelDeclaration
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean
  public override readonly span: Span
  public override readonly children: ReadonlyArray<SyntaxNode>

  constructor(
    public readonly identifierToken: SyntaxToken,
    public readonly colonToken: SyntaxToken,
    public readonly name: string
  ) {
    super()
    identifierToken.parent = this
    colonToken.parent = this
    this.children = [identifierToken, colonToken]
    this.isMissing = identifierToken.isMissing || colonToken.isMissing

    const start = identifierToken.span.position
    const end = colonToken.span.position + colonToken.span.width
    this.span = { position: start, width: end - start }
  }
}

export class RootSyntaxNode extends SyntaxNode {
  public override readonly kind = SyntaxNodeKind.Root
  public override parent?: SyntaxNode
  public override readonly isMissing: boolean = false
  public override readonly span: Span
  public override readonly children: ReadonlyArray<SyntaxNode>

  constructor(
    public readonly statements: SyntaxList<SyntaxNode>,
    public readonly endOfFileToken: SyntaxToken
  ) {
    super()
    statements.parent = this
    endOfFileToken.parent = this
    this.children = [statements, endOfFileToken]

    const start = statements.elements.length > 0 ? statements.span.position : endOfFileToken.span.position
    const end = endOfFileToken.span.position + endOfFileToken.span.width
    this.span = { position: start, width: end - start }
  }
}