import chamadaFuncaoSimplesCode from './examples/chamada_funcaoSimples.vm?raw';
import maior2numLidosCode from './examples/maior2numLidos.vm?raw';
import menorCode from './examples/menor.vm?raw';
import produtoNCode from './examples/produtoN.vm?raw';
import somaNelementosArrayCode from './examples/somaNelementosArray.vm?raw';
import squareRepeatFunctionCode from './examples/square-repeat-function.vm?raw';
import squareRepeatCode from './examples/square-repeat.vm?raw';
import type { Example } from '../types';

export const examples: Example[] = [
  {
    "title": "Chamada a uma função simples",
    "category": "Categoria 1",
    "description": "Função simples que escreve 77 no monitor.",
    "difficulty": 1,
    "file": "chamada_funcaoSimples.vm",
    "code": chamadaFuncaoSimplesCode
  },
  {
    "title": "Soma de N números lidos e armazenados",
    "category": "Categoria 2",
    "description": "lê N, a seguir lê N elementos, guarda-os num array, calcula a sua soma, imprime este valor.",
    "difficulty": 2,
    "file": "somaNelementosArray.vm",
    "code": somaNelementosArrayCode
  },
  {
    "title": "Maior de 2 números lidos",
    "category": "Categoria 1",
    "description": "Lê dois números, guarda-os, compara-os e imprime o maior.",
    "difficulty": 1,
    "file": "maior2numLidos.vm",
    "code": maior2numLidosCode
  },
  {
    "title": "Smallest Number",
    "category": "Categoria 1",
    "description": "Selects the smaller number in the array.",
    "difficulty": 1,
    "file": "menor.vm",
    "code": menorCode
  },
  {
    "title": "Array Multiplication",
    "category": "Categoria A265",
    "description": "Multiplies all the written numbers.",
    "difficulty": 1,
    "file": "produtoN.vm",
    "code": produtoNCode
  },
  {
    "title": "Square Repeat",
    "category": "Cat",
    "description": "Calculates the square number of the written number and all its inferior numbers",
    "difficulty": 1,
    "file": "square-repeat.vm",
    "code": squareRepeatCode
  },
  {
    "title": "Square Repeat - Function",
    "category": "Functions",
    "description": "Calculates the square number of the written number and all its inferior numbers",
    "difficulty": 1,
    "file": "square-repeat-function.vm",
    "code": squareRepeatFunctionCode
  }
]
