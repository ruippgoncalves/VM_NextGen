import type { Span } from "./text.js"

export enum DiagnosticAnnotationFlags
{
    Unnecessary,
    Deprecated,
}

export enum DiagnosticSeverity
{
    Hint,
    Information,
    Warning,
    Error,
}

export type DiagnosticId = {
    readonly namespace: string
    readonly id: number
    readonly severity: DiagnosticSeverity
    readonly flags: Set<DiagnosticAnnotationFlags>
}

export type Diagnostic = {
    readonly id: DiagnosticId
    readonly span: Span
    readonly message: string
}
