<template>
  <div class="w3-container w3-margin-left" style="display:flex; flex-flow:column; height:100%; min-height:700px;">
    
    <div>
      <h1 class="w3-text-blue-grey" style="display: inline;"><b>Virtual Machine EWVM</b></h1>
      <div class="w3-right w3-margin-right" style="margin-top: 15px;">
        <button @click="runCode" class="w3-button w3-padding-small w3-round-large w3-blue-grey" style="margin-right:3px">Run</button>
        <button @click="openExamplesModal" class="w3-button w3-padding-small w3-round-large w3-blue-grey" style="margin-right:3px">Examples</button>
        <button @click="showManual = true" class="w3-button w3-padding-small w3-round-large w3-blue-grey" style="margin-right:3px">Documentation</button>
        <button @click="showCredits = true" class="w3-button w3-padding-small w3-round-large w3-blue-grey" style="margin-right:3px">Credits</button>
        <a href="/ewvm-code.vsix" download="ewvm-code.vsix" class="w3-button w3-padding-small w3-round-large w3-blue-grey" style="text-decoration: none;">
          <i class="fa fa-download" style="margin-right: 4px;"></i>VSCode Extension
        </a>
      </div>
    </div>

    <div class="w3-bar" style="height:100%; overflow:auto; display: flex; flex: 1;">
      
      <div class="w3-third" style="padding-right:3%; height:95%;">
        <div style="height: 100%; border: 1px solid #ccc;">
          <VueMonacoEditor
            :value="code"
            @update:value="(newValue: string) => code = newValue"
            theme="vs-light"
            language="EWVM"
            :options="{ minimap: { enabled: false }, automaticLayout: true }"
            @beforeMount="handleEditorBeforeMount"
            @mount="handleEditorMount"
          />
        </div>
      </div>

      <div class="w3-twothird" style="display:flex; flex-flow:column; padding-right:1%; height: 100%;">
        <VMPanel
          ref="vmPanelRef"
          :code="code"
          @stepChange="handleStepChange"
        />
      </div>
    </div>

    <div v-if="showExamples" class="w3-modal" style="display:block;">
      <div class="w3-modal-content w3-animate-zoom w3-card-4 w3-round-large" style="width:700px; padding:20px;">
        <header class="w3-container">
          <span @click="showExamples = false" class="w3-button w3-display-topright w3-round-large">&times;</span>
          <h2 class="w3-text-blue-grey"><b>Examples</b></h2>
          
          <div class="w3-margin-bottom">
            <span class="w3-text-blue-grey"><b>Order By:</b></span>
            <button @click="fetchExamples('')" class="w3-button w3-small w3-border w3-round w3-margin-left">Title</button>
            <button @click="fetchExamples('cat')" class="w3-button w3-small w3-border w3-round w3-margin-left">Category</button>
            <button @click="fetchExamples('dif')" class="w3-button w3-small w3-border w3-round w3-margin-left">Difficulty</button>
          </div>
        </header>

        <div class="w3-container" style="max-height:450px; overflow:auto;">
          <div v-if="!Array.isArray(examplesList)">
            <div v-for="(group, key) in (examplesList as any)" :key="key" class="w3-margin-bottom">
              <h3 class="w3-border-bottom w3-text-blue-grey" style="padding-bottom:5px;"><b>{{ key }}</b></h3>
              <div v-for="e in group" :key="e.title" class="w3-padding-small w3-hover-light-grey w3-border-bottom" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <b class="w3-text-dark-grey">{{ e.title }}</b><br>
                  <small class="w3-text-grey">{{ e.description }}</small>
                </div>
                <button @click="loadExampleCode(e.code)" class="w3-button w3-small w3-blue-grey w3-round">Load</button>
              </div>
            </div>
          </div>

          <div v-else>
            <div v-for="e in examplesList" :key="e.title" class="w3-padding-small w3-hover-light-grey w3-border-bottom" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <b class="w3-text-dark-grey">{{ e.title }}</b> <span class="w3-tag w3-round w3-small w3-indigo">{{ e.category }}</span><br>
                <small class="w3-text-grey">{{ e.description }}</small>
              </div>
              <button @click="loadExampleCode(e.code)" class="w3-button w3-small w3-blue-grey w3-round">Load</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showManual" class="w3-modal" style="display:block;">
      <div class="w3-modal-content w3-animate-zoom w3-card-4 w3-round-large" style="width:800px; padding:20px;">
        <header class="w3-container">
          <span @click="showManual = false" class="w3-button w3-display-topright w3-round-large">&times;</span>
          <h2 class="w3-text-blue-grey"><b>Instruction Documentation</b></h2>
        </header>
        
        <div class="w3-container" style="max-height:500px; overflow:auto; padding-top:10px;">
          <div v-for="(category, index) in manualDocs" :key="index" class="w3-margin-bottom">
            <h3 class="w3-blue-grey w3-padding-small w3-round"><b>{{ category[0] }}</b></h3>
            
            <div style="padding-left:15px;">
              <div v-if="Array.isArray(category[1])">
                <div v-for="(sub, subIdx) in category[1]" :key="subIdx" class="w3-margin-bottom">
                  <h4 class="w3-text-indigo"><b>{{ sub[0] }}</b></h4>
                  <table class="w3-table-all w3-small">
                    <tr v-for="(desc, inst) in (sub[1] as any)" :key="inst">
                      <td style="width:120px;"><b class="w3-text-red">{{ inst }}</b></td>
                      <td>{{ desc }}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <div v-else>
                <table class="w3-table-all w3-small">
                  <tr v-for="(desc, inst) in (category[1] as any)" :key="inst">
                    <td style="width:120px;"><b class="w3-text-red">{{ inst }}</b></td>
                    <td>{{ desc }}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCredits" class="w3-modal" style="display:block;">
      <div class="w3-modal-content w3-animate-zoom w3-card-4 w3-round-large" style="width:650px; padding:20px;">
        <header class="w3-container">
          <span @click="showCredits = false" class="w3-button w3-display-topright w3-round-large">&times;</span>
          <h2 class="w3-text-blue-grey"><b>Autoria e Contributos</b></h2>
        </header>
        <div class="w3-container">
          <p class="w3-text-grey">Identificação das pessoas que permitiram ter esta ferramenta pedagógica operacional online:</p>
          <table class="w3-table-all w3-hoverable w3-small">
            <thead>
              <tr class="w3-blue-grey">
                <th>Nome</th>
                <th>Período</th>
                <th>Contributo</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><b>Sofia Teixeira</b></td><td>Outubro de 2022</td><td>Com a sua tese de mestrado criou a 1ª versão da plataforma.</td></tr>
              <tr><td><b>Francisco Ferreira</b></td><td>2º Sem. 2023/2024</td><td>Correções de erros e novas instruções na VM.</td></tr>
              <tr><td><b>Rui Gonçalves</b></td><td>2º Sem. 2023/2024</td><td>Correções de erros e novas instruções na VM.</td></tr>
              <tr><td><b>Daniel Pereira</b></td><td>2º Sem. 2023/2024</td><td>Correções de erros e novas instruções na VM.</td></tr>
              <tr><td><b>Luís Ribeiro</b></td><td>2º Sem. 2023/2024</td><td>Adição de 2 novas instruções: COPY e COPYN.</td></tr>
              <tr><td><b>Rafael Fernandes</b></td><td>2º Sem. 2024/2025</td><td>Correção da instrução CHECK e robustez multiutilizador.</td></tr>
              <tr><td><b>Humberto Gomes</b></td><td>2º Sem. 2024/2025</td><td>Correção da instrução ALLOCN.</td></tr>
              <tr><td><b>Frederico Afonso</b></td><td>2º Sem. 2024/2025</td><td>Otimização das instruções DUP e DUPN.</td></tr>
              <tr><td><b>Prof. Pedro Rangel Henriques</b></td><td>Desde sempre...</td><td>O mentor da ideia pedagógica.</td></tr>
              <tr><td><b>Prof. José Carlos Ramalho</b></td><td>Desde sempre...</td><td>O DevOps sempre de serviço. Criador da nova versão.</td></tr>
            </tbody>
          </table>
          <p class="w3-small w3-right-align w3-text-grey" v-if="metadata"><b>Versão:</b> {{ metadata.version }} ({{ metadata.vdate }})</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { VMPanel,  } from 'ewvm-vue'
import { Example, ExampleGroupMap, getExamples } from './services/exampleService'
import { manualDocs } from './data/manual'
import { metadata } from './data/metadata'
import { Instruction } from 'ewvm'

const code = ref<string>('start\npushi 10\nwritei\nstop')
const vmPanelRef = ref<InstanceType<typeof VMPanel> | null>(null)

const showExamples = ref<boolean>(false)
const showManual = ref<boolean>(false)
const showCredits = ref<boolean>(false)
const examplesList = ref<Example[] | ExampleGroupMap>([])

const editorRef = shallowRef<any>(null)
const decorations = shallowRef<any>(null)

const handleEditorMount = (editor: any) => {
  editorRef.value = editor
  decorations.value = editor.createDecorationsCollection()
}

const insts = new Array<string>()
for (const key of Object.keys(Instruction)) {
  if (isNaN(Number(key))) {
    insts.push(key)
  }
}

let instsRegex = insts.sort((a, b) => a.length - b.length).reverse().join('|')
instsRegex = instsRegex + '|' + instsRegex.toLowerCase()

const handleEditorBeforeMount = (monaco: any) => {
  monaco.languages.register({ id: 'EWVM' })
  monaco.languages.setMonarchTokensProvider('EWVM', {
    tokenizer: {
      root: [
        [/[+\-]?\d+/, 'number'],
        [/".*?"/, 'string'],
        [new RegExp(instsRegex, 'i'), 'keyword'],
        [/;.*/, 'comment'],
        [/[A-Za-z_][A-Za-z0-9_]*/, 'identifier']
      ]
    }
  })
}

const handleStepChange = (line: number) => {
  if (decorations.value) {
    if (line > 0) {
      decorations.value.set([
        {
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: 'highlight-debug'
          }
        }
      ])
    } else {
      decorations.value.set([])
    }
  }
}

const runCode = () => {
  vmPanelRef.value?.runCode(code.value)
}

const fetchExamples = (orderBy: string = '') => {
  examplesList.value = getExamples(orderBy)
}

const openExamplesModal = () => {
  fetchExamples()
  showExamples.value = true
}

const loadExampleCode = (exampleCode: string) => {
  if (exampleCode) {
    code.value = exampleCode
    vmPanelRef.value?.reset()
    showExamples.value = false
  }
}
</script>

<style>
.highlight-debug {
  background-color: #ffffa0;
}
</style>