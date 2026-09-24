/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Embedding of vm files
declare module '*.vm?raw' {
  const content: string;
  export default content;
}

// TODO we are going to do this manually later on, when we add language services, for now leave it
declare module '@guolao/vue-monaco-editor' {
  import type { DefineComponent } from 'vue';
  export const VueMonacoEditor: DefineComponent<any, any, any>;
}
