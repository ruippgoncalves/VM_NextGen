<template>
  <div
    class="ewvm-panel"
    style="display: flex; flex-direction: column; height: 100%; width: 100%"
  >
    <div
      v-if="showRunButton"
      class="w3-bar w3-padding-small w3-light-grey w3-border-bottom"
      style="display: flex; align-items: center; justify-content: space-between"
    >
      <span class="w3-text-blue-grey"><b>EWVM Execution</b></span>
      <button
        @click="() => runCode()"
        class="w3-button w3-small w3-round w3-blue-grey"
      >
        <i class="fa fa-play" style="margin-right: 4px"></i> Run
      </button>
    </div>

    <div
      class="w3-container w3-border"
      style="
        display: flex;
        flex: 1;
        background-image: linear-gradient(white, #e9f2fa);
        padding: 10px;
      "
    >
      <div class="w3-quarter" style="height: 100%; text-align: center">
        <div
          class="w3-border w3-white w3-margin"
          style="height: 85%; overflow: auto; padding: 5px"
        >
          <div
            v-for="(call, i) in currentCallStack"
            :key="i"
            class="w3-padding-small w3-border-bottom"
          >
            PC: {{ call[0] }} | FP: {{ call[1] }}
          </div>
        </div>
        <span>Call Stack</span>
      </div>

      <div class="w3-quarter" style="height: 100%; text-align: center">
        <div
          class="w3-border w3-white w3-margin"
          style="
            height: 85%;
            overflow: auto;
            display: flex;
            flex-direction: column-reverse;
            padding: 5px;
          "
        >
          <div
            v-for="(val, i) in currentOperandStack as unknown"
            :key="i"
            style="padding: 2px 8px; margin-bottom: 3px"
            :style="getOperandStackStyle(i)"
          >
            {{ val }}
          </div>
        </div>
        <span>Operand Stack</span>
      </div>

      <div class="w3-half" style="height: 100%">
        <div style="height: 50%; text-align: center">
          <div
            class="w3-border w3-white w3-margin"
            style="height: 70%; overflow: auto"
          >
            <div
              v-for="(str, i) in currentStringHeap"
              :key="i"
              class="w3-padding-small w3-border-bottom"
            >
              {{ str }}
            </div>
          </div>
          <span>String Heap</span>
        </div>
        <div style="height: 50%; text-align: center">
          <div
            class="w3-border w3-white w3-margin"
            style="height: 70%; overflow: auto"
          >
            <div
              v-for="(struct, i) in currentStructHeap"
              :key="i"
              class="w3-padding-small w3-border-bottom"
            >
              {{ struct }}
            </div>
          </div>
          <span>Struct Heap</span>
        </div>
      </div>
    </div>

    <div class="w3-container" style="padding: 4px 0">
      <button
        class="w3-btn w3-round w3-small w3-light-grey"
        @click="currentIndex = 0"
      >
        &lt;&lt;
      </button>
      <button
        class="w3-btn w3-round w3-small w3-light-grey w3-margin-left"
        @click="prevStep"
      >
        &lt;
      </button>
      <span class="w3-margin-left w3-margin-right"
        ><b
          >Step: {{ currentIndex }} /
          {{ animation.length > 0 ? animation.length - 1 : 0 }}</b
        ></span
      >
      <button class="w3-btn w3-round w3-small w3-light-grey" @click="nextStep">
        &gt;
      </button>
      <button
        class="w3-btn w3-round w3-small w3-light-grey w3-margin-left"
        @click="currentIndex = animation.length > 0 ? animation.length - 1 : 0"
      >
        &gt;&gt;
      </button>

      <span class="w3-margin-left" style="color: blue">GP: 0</span>
      <span class="w3-margin-left" style="color: red">FP: {{ currentFP }}</span>
      <span class="w3-margin-left" style="color: green"
        >SP: {{ currentOperandStack.length }}</span
      >
    </div>

    <div style="height: 140px" class="w3-margin-bottom">
      <b class="w3-text-blue-grey">Output:</b>
      <div
        ref="terminalContainer"
        class="w3-border w3-white"
        style="
          height: 80%;
          padding: 5px;
          overflow: auto;
          font-family: monospace;
          white-space: pre-wrap;
        "
      >
        <div v-for="(line, i) in terminal" :key="i">{{ line }}</div>
      </div>
    </div>

    <!--   MODAL de input   -->

    <div
      v-if="needsInput"
      class="w3-modal"
      style="
        display: block;
        z-index: 9999;
        height: calc(100vh - 160px);
        padding-top: 50px;
      "
    >
      <div
        class="w3-modal-content w3-animate-top w3-card-4 w3-round-large"
        style="max-width: 450px; padding: 10px"
      >
        <header class="w3-container w3-center">
          <span
            @click="cancelInput"
            class="w3-button w3-display-topright w3-round-large w3-hover-red"
            >&times;</span
          >
          <h3 class="w3-text-blue-grey"><b>Aguardando Input</b></h3>
        </header>

        <div class="w3-container w3-padding-16">
          <p class="w3-text-grey w3-center">
            A Máquina Virtual encontrou uma instrução <code>read</code> e
            encontra-se em pausa. Insira um valor para continuar a execução:
          </p>

          <input
            v-model="inputValue"
            @keyup.enter="submitInput"
            class="w3-input w3-border w3-round w3-margin-bottom"
            style="text-align: center; font-size: 1.2em"
            autofocus
            placeholder="Escreve aqui..."
          />

          <button
            @click="submitInput"
            class="w3-button w3-blue-grey w3-round w3-block"
          >
            <b>Confirmar</b> <i class="fa fa-check w3-margin-left"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { VMSession } from './vmSession'

const props = withDefaults(defineProps<{
  code?: string
  showRunButton?: boolean
}>(), {
  code: '',
  showRunButton: false
})

const emit = defineEmits<{
  (e: 'stepChange', line: number): void
  (e: 'update:code', value: string): void
  (e: 'terminal', lines: string[]): void
}>()

const terminal = ref<string[]>([])
const animation = ref<any[]>([])
const currentIndex = ref<number>(0)
const needsInput = ref<boolean>(false)
const inputValue = ref<string>('')
const terminalContainer = ref<HTMLDivElement | null>(null)

const session = ref<VMSession>(new VMSession())

const currentFrame = computed(() => animation.value[currentIndex.value] || null)
const currentOperandStack = computed(() => currentFrame.value ? currentFrame.value[1] : [])
const currentCallStack = computed(() => currentFrame.value ? currentFrame.value[2] : [])
const currentStringHeap = computed(() => currentFrame.value ? currentFrame.value[3] : [])
const currentStructHeap = computed(() => currentFrame.value ? currentFrame.value[4] : [])
const currentFP = computed(() => (currentFrame.value && currentFrame.value[5] !== -1) ? currentFrame.value[5] : '-')
const currentLine = computed(() => currentFrame.value ? currentFrame.value[0] : 0)

watch(
  terminal,
  async () => {
    emit('terminal', terminal.value)
    await nextTick()
    if (terminalContainer.value) {
      terminalContainer.value.scrollTop = terminalContainer.value.scrollHeight
    }
  },
  { deep: true }
)

watch(currentLine, (line: number) => {
  emit('stepChange', line)
}, { immediate: true })

const runCode = (codeToRun?: string) => {
  const source = codeToRun !== undefined ? codeToRun : props.code
  session.value.reset()
  const ok = session.value.loadCode(source)
  if (!ok) {
    const out = session.value.out()
    terminal.value = out.terminal
    animation.value = out.animation
    currentIndex.value = 0
    needsInput.value = false
    emit('stepChange', 0)
    return
  }

  session.value.run()
  const out = session.value.out()
  terminal.value = out.terminal
  animation.value = out.animation
  currentIndex.value = animation.value.length > 0 ? animation.value.length - 1 : 0
  needsInput.value = out.input === 1
  inputValue.value = ''
  emit('stepChange', currentLine.value)
}

const submitInput = () => {
  if (inputValue.value !== '') {
    terminal.value.push(`<< ${inputValue.value}`)
    session.value.terminal = [...terminal.value]
    session.value.index = currentIndex.value
    session.value.run(inputValue.value)
    const out = session.value.out()
    terminal.value = out.terminal
    animation.value = out.animation
    currentIndex.value = animation.value.length > 0 ? animation.value.length - 1 : 0
    needsInput.value = out.input === 1
    inputValue.value = ''
    emit('stepChange', currentLine.value)
  }
}

const cancelInput = () => {
  needsInput.value = false
  inputValue.value = ''
  terminal.value.push('>> Execução interrompida: Input cancelado pelo utilizador.')
}

const prevStep = () => {
  if (currentIndex.value > 0) currentIndex.value--
}

const nextStep = () => {
  if (currentIndex.value < animation.value.length - 1) currentIndex.value++
}

const getOperandStackStyle = (index: number) => {
  let border = '1px solid #ccc'
  if (index === currentFP.value) border = '3px solid red'
  return {
    border: border,
    background: '#607d8b',
    color: 'white',
    borderRadius: '4px'
  }
}

const reset = () => {
  session.value.reset()
  terminal.value = []
  animation.value = []
  currentIndex.value = 0
  needsInput.value = false
  inputValue.value = ''
  emit('stepChange', 0)
}

defineExpose({
  runCode,
  reset,
  prevStep,
  nextStep,
  submitInput,
  currentLine,
  terminal
})
</script>

<style scoped>
.ewvm-panel {
  box-sizing: border-box;
}
</style>
