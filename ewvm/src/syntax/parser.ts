import {
  Instruction,
  getInstructionArgTypes,
  type InstructionArgTypes,
} from '../common/instruction.js'
import { DiagnosticSeverity, type Diagnostic } from '../common/diagnostic.js'
import type { Span } from '../common/text.js'
import { Lexer } from './lexer.js'
import {
  SyntaxTokenKind,
  SyntaxNode,
  SyntaxToken,
  SyntaxList,
  SingletonSyntaxList,
  IntLiteralSyntaxNode,
  FloatLiteralSyntaxNode,
  StringLiteralSyntaxNode,
  LabelSyntaxNode,
  InstructionSyntaxNode,
  LabelDeclarationSyntaxNode,
  RootSyntaxNode,
  ErrorTriviaSyntaxNode,
} from './tree.js'

export class Parser {
  private readonly lexer: Lexer
  private currentToken: SyntaxToken
  private pendingErrorTrivia: ErrorTriviaSyntaxNode[] = []

  constructor(lexer: Lexer) {
    this.lexer = lexer
    this.currentToken = this.lexer.lex()
  }

  public static parse(source: string): RootSyntaxNode {
    const lexer = new Lexer(source)
    const parser = new Parser(lexer)
    return parser.parseRoot()
  }

  public parseRoot(): RootSyntaxNode {
    const statements: SyntaxNode[] = []

    while (!this.isAtEnd()) {
      this.skipBadTokens()
      if (this.isAtEnd()) break

      statements.push(this.parseStatement())
    }

    let eosToken: SyntaxToken
    if (this.currentToken.tokenKind === SyntaxTokenKind.Eos) {
      eosToken = this.advance()
    } else {
      eosToken = new SyntaxToken(SyntaxTokenKind.Eos, '', this.currentToken.span.position, [], [], true)
    }

    for (const trivia of this.pendingErrorTrivia) {
      eosToken.addLeadingTrivia(trivia)
    }
    this.pendingErrorTrivia = []

    const root = new RootSyntaxNode(new SyntaxList(statements), eosToken)
    if (eosToken.isMissing) {
      this.addDiagnostic(root, 'Expected end of stream', 1003)
    }
    return root
  }

  private skipBadTokens(): void {
    if (this.isAtEnd() || this.isStatementStart(this.currentToken)) {
      return
    }

    const startPos = this.currentToken.span.position
    const skippedTokens: SyntaxToken[] = []

    while (!this.isAtEnd() && !this.isStatementStart(this.currentToken)) {
      skippedTokens.push(this.advance())
    }

    const lastToken = skippedTokens[skippedTokens.length - 1]!
    const endPos = lastToken.span.position + lastToken.span.width
    const text = skippedTokens.map((t) => t.text).join(' ')
    const span: Span = {
      position: startPos,
      width: endPos - startPos,
    }

    const errorTrivia = new ErrorTriviaSyntaxNode(text, startPos)
    errorTrivia.addDiagnostic(
      this.createDiagnostic(
        span,
        `Unexpected token(s): '${text}'`,
        1001
      )
    )
    this.pendingErrorTrivia.push(errorTrivia)
  }

  private isStatementStart(token: SyntaxToken): boolean {
    return token.tokenKind === SyntaxTokenKind.Label || this.isInstruction(token)
  }

  private isInstruction(token: SyntaxToken): boolean {
    return Instruction[token.tokenKind] !== undefined
  }

  private parseStatement(): SyntaxNode {
    const node =
      this.currentToken.tokenKind === SyntaxTokenKind.Label
        ? this.parseLabelDeclaration()
        : this.parseInstruction()

    for (const trivia of this.pendingErrorTrivia) {
      node.addLeadingTrivia(trivia)
    }
    this.pendingErrorTrivia = []

    return node
  }

  private parseLabelDeclaration(): LabelDeclarationSyntaxNode {
    const idToken = this.advance()
    let colonToken: SyntaxToken

    if (this.currentToken.tokenKind === SyntaxTokenKind.Colon) {
      colonToken = this.advance()
    } else {
      colonToken = new SyntaxToken(SyntaxTokenKind.Colon, '', this.currentToken.span.position, [], [], true)
    }

    const node = new LabelDeclarationSyntaxNode(idToken, colonToken, idToken.text)
    if (colonToken.isMissing) {
      this.addDiagnostic(
        node,
        `Expected ':' after label '${idToken.text}'`,
        1002
      )
    }
    return node
  }

  private parseInstruction(): InstructionSyntaxNode {
    const instToken = this.advance()
    const inst = instToken.tokenKind as unknown as Instruction

    const expectedArgTypes = getInstructionArgTypes(inst)
    const argNodes: SyntaxNode[] = []
    let hasMissingArg = false

    for (let i = 0; i < expectedArgTypes.length; i++) {
      const expectedType = expectedArgTypes[i]!
      const argNode = this.parseArgument(expectedType)
      if (argNode !== null) {
        argNodes.push(argNode)
      } else {
        hasMissingArg = true
        break
      }
    }

    let args: SyntaxList<SyntaxNode> | null = null
    if (argNodes.length === 1) {
      args = new SingletonSyntaxList(argNodes[0]!)
    } else if (argNodes.length > 1) {
      args = new SyntaxList(argNodes)
    }

    const node = new InstructionSyntaxNode(instToken, inst, args)

    if (hasMissingArg) {
      this.addDiagnostic(
        node,
        `Instruction '${instToken.text}' expects ${expectedArgTypes.length} argument(s) (${expectedArgTypes.join(', ')}), but found ${argNodes.length}`,
        1004
      )
    }

    return node
  }

  private parseArgument(expectedType: InstructionArgTypes): SyntaxNode | null {
    switch (expectedType) {
      case 'int':
        return this.parseIntegerArgument()
      case 'float':
        return this.parseFloatArgument()
      case 'string':
        return this.parseStringArgument()
      case 'label':
        return this.parseLabelArgument()
    }
  }

  private parseIntegerArgument(): IntLiteralSyntaxNode | null {
    if (this.currentToken.tokenKind === SyntaxTokenKind.Int) {
      const tok = this.advance()
      const val = typeof tok.value === 'number' ? tok.value : parseInt(tok.text, 10)
      return new IntLiteralSyntaxNode(tok, val)
    }
    return null
  }

  private parseFloatArgument(): FloatLiteralSyntaxNode | null {
    if (this.currentToken.tokenKind === SyntaxTokenKind.Float || this.currentToken.tokenKind === SyntaxTokenKind.Int) {
      const tok = this.advance()
      const val = typeof tok.value === 'number' ? tok.value : parseFloat(tok.text)
      return new FloatLiteralSyntaxNode(tok, val)
    }
    return null
  }

  private parseStringArgument(): StringLiteralSyntaxNode | null {
    if (this.currentToken.tokenKind === SyntaxTokenKind.String) {
      const tok = this.advance()
      const val = typeof tok.value === 'string' ? tok.value : tok.text.slice(1, -1)
      return new StringLiteralSyntaxNode(tok, val)
    }
    return null
  }

  private parseLabelArgument(): LabelSyntaxNode | null {
    if (this.currentToken.tokenKind === SyntaxTokenKind.Label || this.isInstruction(this.currentToken)) {
      const tok = this.advance()
      return new LabelSyntaxNode(tok, tok.text)
    }
    return null
  }

  private advance(): SyntaxToken {
    const token = this.currentToken
    this.currentToken = this.lexer.lex()
    return token
  }

  private isAtEnd(): boolean {
    return this.currentToken.tokenKind === SyntaxTokenKind.Eos
  }

  private createDiagnostic(span: Span, message: string, id: number): Diagnostic {
    return {
      id: {
        namespace: 'Syntax',
        id,
        severity: DiagnosticSeverity.Error,
        flags: new Set(),
      },
      span,
      message,
    }
  }

  private addDiagnostic(node: SyntaxNode, message: string, id: number): void {
    node.addDiagnostic(this.createDiagnostic(node.span, message, id))
  }
}
