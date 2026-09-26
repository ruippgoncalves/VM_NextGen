<template>
  <div class="ewvm-vscode-wrapper" style="display: flex; flex-direction: column; height: 100vh; padding: 8px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <h4 style="margin: 0; color: #455a64;">
        <b>EWVM Runner</b>
      </h4>
      <button 
        @click="runCode" 
        class="w3-button w3-small w3-round w3-blue-grey"
        style="padding: 4px 10px;"
      >
        <i class="fa fa-play" style="margin-right: 4px;"></i> Run
      </button>
    </div>

    <div style="flex: 1; min-height: 0; display: flex; flex-direction: column;">
      <VMPanel
        ref="vmPanelRef"
        :code="code"
        @stepChange="onStepChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VMPanel } from 'ewvm-vue'

declare function acquireVsCodeApi(): {
  postMessage: (message: any) => void
  getState: () => any
  setState: (state: any) => void
}

let vscode: any = null
try {
  if (typeof acquireVsCodeApi === 'function') {
    vscode = acquireVsCodeApi()
  }
} catch {
  // Not inside VSCode webview (browser preview mode)
}

const code = ref<string>('')
const vmPanelRef = ref<InstanceType<typeof VMPanel> | null>(null)

const runCode = () => {
  vmPanelRef.value?.runCode(code.value)
}

const onStepChange = (line: number) => {
  if (vscode) {
    vscode.postMessage({
      command: 'stepChange',
      line
    })
  }
}

onMounted(() => {
  window.addEventListener('message', (event) => {
    const message = event.data
    if (!message) return

    if (message.command === 'run' || message.command === 'updateCode') {
      code.value = message.code ?? ''
      vmPanelRef.value?.runCode(code.value)
    }
  })

  if (vscode) {
    vscode.postMessage({ command: 'ready' })
  }
})
</script>

<style>
body {
  margin: 0;
  padding: 0;
  background-color: #f7f9fa;
  color: #333;
}
</style>
