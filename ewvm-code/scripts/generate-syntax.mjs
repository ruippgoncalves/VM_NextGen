import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Instruction } from 'ewvm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const insts = [];
for (const key of Object.keys(Instruction)) {
  if (isNaN(Number(key))) {
    insts.push(key);
  }
}

const instsRegex = insts.join('|');

const syntax = {
  $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
  name: 'EWVM',
  scopeName: 'source.ewvm',
  patterns: [
    { include: '#comments' },
    { include: '#strings' },
    { include: '#numbers' },
    { include: '#keywords' },
    { include: '#identifiers' }
  ],
  repository: {
    comments: {
      patterns: [
        {
          name: 'comment.line.semicolon.ewvm',
          match: ';.*$'
        }
      ]
    },
    strings: {
      patterns: [
        {
          name: 'string.quoted.double.ewvm',
          begin: '"',
          end: '"',
          patterns: [
            {
              name: 'constant.character.escape.ewvm',
              match: '\\\\.'
            }
          ]
        }
      ]
    },
    numbers: {
      patterns: [
        {
          name: 'constant.numeric.ewvm',
          match: '\\b[+\\-]?[0-9]+(\\.[0-9]+)?\\b'
        }
      ]
    },
    keywords: {
      patterns: [
        {
          name: 'keyword.control.instruction.ewvm',
          match: `(?i)\\b(${instsRegex})\\b`
        }
      ]
    },
    identifiers: {
      patterns: [
        {
          name: 'variable.other.ewvm',
          match: '\\b[a-zA-Z_][a-zA-Z0-9_]*\\b'
        }
      ]
    }
  }
};

const outputPath = path.resolve(__dirname, '../syntaxes/ewvm.tmLanguage.json');
fs.writeFileSync(outputPath, JSON.stringify(syntax, null, 2) + '\n');
