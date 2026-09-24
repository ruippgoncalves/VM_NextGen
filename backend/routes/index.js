/* -- Metadados de controlo -- */
const metadados = { version: "2.0", vdate: "2026-05-18" }
/* -- Metadados de controlo -- */

const express = require('express');
const router = express.Router();
const peggy = require("peggy");

// Importações dos teus módulos locais (mantêm-se iguais)
const {grammar, manual, vm} = require('ewvm');
const EphemeralStorage = require('../util/EphemeralStorage.js');
const makeId = require('../util/makeId.js');

const parser = peggy.generate(grammar.grammar());

const sessionStorage = new EphemeralStorage({
  autoPrune: {
    interval: 500
  },
  ttl: 15 * 60000 // 15m
});

class SessionData {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.reset();
  }

  reset() {
    this.pointer_code = 0;
    this.call_stack = [];
    this.operand_stack = [];
    this.frame_pointer = 0;
    this.code_stack = [];
    this.string_heap = [];
    this.struct_heap = [];
    this.code = "";
    this.animation = [];

    this.result = undefined;
    this.index = 0;
    this.input = 0;
    this.terminal = [];
  }

  loadCode(code) {
    this.code = code;

    const preparedCode = grammar.lowerGrammar(code)
    try {
      this.code_stack = parser.parse(preparedCode)
      return true;
    } catch (error) {
      this.result = [`GRAMMAR - ${error}`];
      this.animation = ["error"];
      return false;
    }
  }

  run(input = null) {
    try {
      const results = vm.run(
        input, 
        this.code_stack, 
        this.pointer_code, 
        this.call_stack, 
        this.operand_stack, 
        this.frame_pointer, 
        this.string_heap, 
        this.struct_heap, 
        this.animation, 
        this.terminal.length - 1
      ); 

      this.input = results[0];
      if (Array.isArray(results[1])) this.result = this.terminal.concat(results[1])  
      else this.result = [results[1]]

      this.pointer_code = results[2];
      this.call_stack = results[3];
      this.operand_stack = results[4];
      this.frame_pointer = results[5];
      this.string_heap = results[6];
      this.struct_heap = results[7];
      this.animation = results[8];
    } catch(e) {
      this.result = [`Anomaly: ${e?.message ?? e ?? "Unknown"}`];
      this.animation = ["error"];
    }
  }

  out() {
    return { 
      code: this.code, 
      terminal: this.result, 
      input: this.input, 
      // Alteração: Devolvemos a array diretamente em vez de JSON.stringify()
      animation: this.animation, 
      index: this.index, 
      metadados: metadados, 
      sessionId: this.sessionId
    };
  }

  error(result) {
    this.animation = ["error"];
    this.result = [result];

    return this.out();
  }
}

/* -- ROTAS DA API -- */

// Endpoint inicial para obter as variáveis por defeito e um sessionId
router.get('/init', function(req, res) {
  const sessionId = req.query._q ?? makeId(64);
  res.json({ 
    success: true,
    data: {
      title: 'EWVM', 
      code: '', 
      terminal: [], 
      input: 0, 
      animation: [], 
      index: 0, 
      metadados: metadados, 
      sessionId: sessionId 
    }
  });
});

// Endpoint para obter a documentação
router.get('/manual', function(req, res) {
  res.json({ success: true, data: manual });
});

// Endpoint para obter os créditos e metadados
router.get('/credits', function(req, res) {
  res.json({ success: true, data: metadados });
});

// Endpoint principal de execução da Máquina Virtual
router.post('/run', function(req, res) {
  const sessionId = req.body.sessionId ?? makeId(64);
  
  let sessionData, ressurected = false;
  if (!sessionStorage.has(sessionId)) {
    const _sessionData = new SessionData(sessionId);
    sessionStorage.add(sessionId, _sessionData);
    sessionData = _sessionData;
  } else {
    sessionData = sessionStorage.get(req.body.sessionId);
    ressurected = true;
  }

  if (req.body.code !== undefined && (!req.body.input || !ressurected)) {
    sessionData.reset();

    let lCodeRes = sessionData.loadCode(req.body.code);
    if (lCodeRes !== true) {
      // Se a gramática falhar, devolvemos status 400 (Bad Request)
      return res.status(400).json({ success: false, data: sessionData.out() });
    }

    if (!Array.isArray(sessionData.code_stack)) {
      return res.status(400).json({ success: false, data: sessionData.error(sessionData.code_stack) });
    }
  }
  
  if (req.body.input != undefined && ressurected) {
    sessionData.index = req.body.index;
    
    // Alteração: Em vez de um replace/split complexo de string (que era feito por causa do formulário HTML), 
    // assumimos que o Vue 3 nos vai enviar o array do terminal de forma limpa.
    sessionData.terminal = Array.isArray(req.body.terminal) ? req.body.terminal : [];
    sessionData.run(req.body.input);
  } else {
    sessionData.run();
  }

  return res.json({ success: true, data: sessionData.out() });
});

module.exports = router;