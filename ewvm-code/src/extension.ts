import * as vscode from 'vscode'
import * as path from 'path'

let currentPanel: vscode.WebviewPanel | undefined = undefined
let highlightDecoration: vscode.TextEditorDecorationType | undefined = undefined
let currentDocumentUri: vscode.Uri | undefined = undefined

export function activate(context: vscode.ExtensionContext) {
  highlightDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    overviewRulerColor: '#ffffa0',
    overviewRulerLane: vscode.OverviewRulerLane.Full,
    light: {
      backgroundColor: '#ffffa0'
    },
    dark: {
      backgroundColor: 'rgba(255, 255, 160, 0.4)'
    }
  })

  const runCommand = vscode.commands.registerCommand('ewvm-code.runToSide', () => {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor) {
      vscode.window.showInformationMessage('Open an EWVM (.vm) file to run it.')
      return
    }

    const document = activeEditor.document
    currentDocumentUri = document.uri
    const code = document.getText()
    const fileName = path.basename(document.fileName)

    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.Beside)
      currentPanel.title = `EWVM: ${fileName}`
      currentPanel.webview.postMessage({ command: 'run', code })
      return
    }

    currentPanel = vscode.window.createWebviewPanel(
      'ewvmPreview',
      `EWVM: ${fileName}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist-webview')
        ]
      }
    )

    currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri)

    currentPanel.webview.onDidReceiveMessage(
      message => {
        if (!message) return
        switch (message.command) {
          case 'ready':
            if (currentPanel) {
              const currentDoc = findTargetDocument() ?? document
              currentPanel.webview.postMessage({ command: 'run', code: currentDoc.getText() })
            }
            break
          case 'stepChange': {
            const targetEditor = findTargetEditor()
            if (targetEditor && highlightDecoration) {
              const line = message.line
              if (typeof line === 'number' && line > 0) {
                const zeroBasedLine = line - 1
                if (zeroBasedLine < targetEditor.document.lineCount) {
                  const range = targetEditor.document.lineAt(zeroBasedLine).range
                  targetEditor.setDecorations(highlightDecoration, [range])
                  targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport)
                }
              } else {
                targetEditor.setDecorations(highlightDecoration, [])
              }
            }
            break
          }
        }
      },
      undefined,
      context.subscriptions
    )

    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined
        currentDocumentUri = undefined
        if (highlightDecoration) {
          for (const editor of vscode.window.visibleTextEditors) {
            editor.setDecorations(highlightDecoration, [])
          }
        }
      },
      undefined,
      context.subscriptions
    )
  })

  context.subscriptions.push(runCommand)
}

function findTargetEditor(): vscode.TextEditor | undefined {
  if (currentDocumentUri) {
    const uriStr = currentDocumentUri.toString()
    const found = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uriStr)
    if (found) return found
  }
  return vscode.window.activeTextEditor
}

function findTargetDocument(): vscode.TextDocument | undefined {
  const editor = findTargetEditor()
  return editor?.document
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist-webview', 'bundle.js'))
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist-webview', 'bundle.css'))

  // The html is not shipped...
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EWVM Preview</title>
  <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  <link rel="stylesheet" href="${styleUri}">
</head>
<body style="margin: 0; padding: 0; height: 100vh; overflow: hidden; background-color: #f7f9fa;">
  <div id="app" style="height: 100vh;"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`
}

export function deactivate() {
  if (highlightDecoration) {
    highlightDecoration.dispose()
  }
}
