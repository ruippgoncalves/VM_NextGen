import { Instruction } from '../common/instruction.js'
import { DiagnosticSeverity, type Diagnostic } from '../common/diagnostic.js'
import {
  SyntaxTokenKind,
  SyntaxToken,
  SyntaxTrivia,
  WhitespaceTriviaSyntaxNode,
  LineBreakTriviaSyntaxNode,
  CommentTriviaSyntaxNode,
  ErrorTriviaSyntaxNode,
} from './tree.js'

// Map instruction name (uppercase) to Instruction enum value
const INSTRUCTION_MAP = new Map<string, Instruction>()
for (const key of Object.keys(Instruction)) {
  if (isNaN(Number(key))) {
    INSTRUCTION_MAP.set(key.toUpperCase(), (Instruction as unknown as Record<string, Instruction>)[key]!)
  }
}

export class Lexer {
  private readonly source: string
  private position: number = 0

  private tokenText: string = ''
  private tokenValue: unknown = undefined
  private isMissing: boolean = false
  private tokenDiagnostics: Diagnostic[] = []

  constructor(source: string) {
    this.source = source
  }

  public lex(): SyntaxToken {
    let leadingTrivia: SyntaxTrivia[] = this.readTrivia(false)

    while (!this.isAtEnd()) {
      const start = this.position
      const kind = this.scanTokenKind()

      // Error character
      if (kind === null) {
        leadingTrivia.push(this.lexErrorTrivia())
        leadingTrivia = leadingTrivia.concat(this.readTrivia(false))
        continue
      }

      const trailingTrivia = this.readTrivia(true)
      const token = new SyntaxToken(
        kind,
        this.tokenText,
        start,
        leadingTrivia,
        trailingTrivia,
        this.isMissing,
        this.tokenValue
      )
      for (const d of this.tokenDiagnostics) {
        token.addDiagnostic(d)
      }
      return token
    }

    return new SyntaxToken(SyntaxTokenKind.Eos, '', this.position, leadingTrivia, [], false)
  }

  private scanTokenKind(): SyntaxTokenKind | null {
    this.tokenText = ''
    this.tokenValue = undefined
    this.isMissing = false
    this.tokenDiagnostics = []

    const ch = this.peek()

    // Label mark
    if (ch == ":") {
      this.tokenText = this.advance()
      return SyntaxTokenKind.Colon
    }

    // String
    if (ch == '"') return this.lexString()

    // Number
    if (ch == '+' || ch == '-' || this.isDigit(ch)) return this.lexNumber()

    // Instruction or label
    if (this.isLabelStart(ch)) return this.lexLabelOrInstruction()

    return null
  }

  private lexNumber(): SyntaxTokenKind {
    let text = this.advance()
    let hasReadPeriod = false

    while (this.isDigit(this.peek()) || (!hasReadPeriod && this.peek() === '.')) {
      const c = this.advance()
      hasReadPeriod ||= c === '.'
      text += c
    }

    this.tokenText = text
    if (hasReadPeriod) {
      this.tokenValue = parseFloat(text)
      return SyntaxTokenKind.Float
    }

    this.tokenValue = parseInt(text, 10)
    return SyntaxTokenKind.Int
  }

  private lexString(): SyntaxTokenKind {
    const start = this.position
    this.advance() // opening '"'
    let unescaped = ''
    let isTerminated = false

    while (!this.isAtEnd()) {
      const ch = this.peek()
      if (ch === '\r' || ch === '\n') break

      if (ch === '"') {
        this.advance()
        isTerminated = true
        break
      }

      if (ch === '\\') {
        this.advance()

        if (this.peek() === 'n') {
          this.advance()
          unescaped += '\n'
        } else {
          unescaped += '\\'
        }

        continue
      }
      
      unescaped += this.advance()
    }

    this.tokenText = this.source.slice(start, this.position)
    this.tokenValue = unescaped
    this.isMissing = false

    if (!isTerminated) {
      this.tokenDiagnostics.push({
        id: { namespace: 'Syntax', id: 1009, severity: DiagnosticSeverity.Error, flags: new Set() },
        span: { position: start, width: this.position - start },
        message: 'Unclosed string literal',
      })
    }

    return SyntaxTokenKind.String
  }

  private lexLabelOrInstruction(): SyntaxTokenKind {
    let text = ''
    while (this.isIdentifierPart(this.peek())) {
      text += this.advance()
    }

    this.tokenText = text
    const inst = INSTRUCTION_MAP.get(text.toUpperCase())
    if (inst !== undefined) {
      this.tokenValue = inst
      return inst as unknown as SyntaxTokenKind
    }

    this.tokenValue = text
    return SyntaxTokenKind.Label
  }

  private readTrivia(isTrailing: boolean): SyntaxTrivia[] {
    const trivia: SyntaxTrivia[] = []

    while (!this.isAtEnd()) {
      const ch = this.peek()

      switch (ch) {
        case ' ':
        case '\t':
          trivia.push(this.lexWhitespace())
          break

        case '\r':
        case '\n':
          trivia.push(this.lexLineBreak())
          if (isTrailing) return trivia
          break

        case ';':
          trivia.push(this.lexComment())
          break

        default:
          return trivia
      }
    }

    return trivia
  }

  private lexWhitespace(): WhitespaceTriviaSyntaxNode {
    const start = this.position
    let text = ''
    while (this.peek() === ' ' || this.peek() === '\t') {
      text += this.advance()
    }
    return new WhitespaceTriviaSyntaxNode(text, start)
  }

  private lexLineBreak(): LineBreakTriviaSyntaxNode {
    const start = this.position
    let text = this.advance()
    if (text === '\r' && this.peek() === '\n') {
      text += this.advance()
    }
    return new LineBreakTriviaSyntaxNode(text, start)
  }

  private lexComment(): CommentTriviaSyntaxNode {
    const semiStart = this.position
    this.advance() // ';'

    const semiTrailing: SyntaxTrivia[] = []
    if (this.peek() === ' ' || this.peek() === '\t') {
      semiTrailing.push(this.lexWhitespace())
    }

    const semicolonToken = new SyntaxToken(
      SyntaxTokenKind.CommentSemicolon,
      ';',
      semiStart,
      [],
      semiTrailing
    )

    // Read comment text
    const commentStart = this.position
    let commentText = ''
    while (!this.isAtEnd() && this.peek() !== '\r' && this.peek() !== '\n') {
      commentText += this.advance()
    }

    const commentToken = new SyntaxToken(
      SyntaxTokenKind.Comment,
      commentText,
      commentStart,
      [],
      [],
      false,
      commentText
    )

    return new CommentTriviaSyntaxNode(semicolonToken, commentToken)
  }

  private lexErrorTrivia(): ErrorTriviaSyntaxNode {
    const start = this.position
    const ch = this.advance()
    const errorTrivia = new ErrorTriviaSyntaxNode(ch, start)
    errorTrivia.addDiagnostic({
      id: { namespace: 'Syntax', id: 1000, severity: DiagnosticSeverity.Error, flags: new Set() },
      span: errorTrivia.span,
      message: `Unexpected character '${ch}'`,
    })
    return errorTrivia
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0'
    return this.source[this.position]!
  }

  private advance(): string {
    const ch = this.source[this.position]!
    this.position++
    return ch
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9'
  }

  private isLabelStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
  }

  private isIdentifierPart(ch: string): boolean {
    return (
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '_'
    )
  }
}
