module.exports = {
    lowerGrammar: function(code){
      return code.replace( /[^"]+|".*?"/g, function(match){
        if(match.charAt(0) != '"' || match.charAt(match.length - 1) != '"') {
          return match.toLowerCase(); 
        }
        else return match
      })
    },
    grammar: function() {
       return `       
       {
        var labelsRead = {};
        var labelsUsed = []
        var codigos = []
        var lines = 1
        var temp_lines = 0
        
        function result(){
            let labelsMissing = labelsUsed.filter(x => !Object.keys(labelsRead).includes(x))
            if (labelsMissing.length != 0) return "Grammar - labels undefined: " + labelsMissing
            
            let cods = replaceEnderecos()
            return cods
        }
        
        function getInd(){
            return codigos.length
        }
        
        function replaceEnderecos(label){
            return codigos.map(x => {
                if (x[1] > 61 && x[1] <= 64) return [x[0], x[1], "code#".concat(labelsRead[x[2]].toString()) ]
                else return x
            }) 
        }
      }
       
       Code = (_ Line)* _  	{ return result() }							
       
       Line = Instruction  ([ \\t]* Comment)* 				
         / Comment 									
       
       Instruction = info:Label ':'						{ labelsRead[info] = getInd(); }
       	 / info:Inst_Atom 								{ codigos.push([lines, info]) }
         / func:Inst_Int _ info:Integer					{ codigos.push([lines, func, info]) }
         / "pushf" _ info:Float							{ codigos.push([lines, 58, info]) }
         / "pushs" _ info:String        				{ codigos.push([lines, 59, info]) }
         / "err" _ info:String        					{ codigos.push([lines, 60, info]) }
         / "check" _ info:(Integer _ "," _ Integer)   	{ codigos.push([lines, 61, info[0], info[4]]) }
         / "jump" _ info:Label 							{ labelsUsed.push(info); codigos.push([lines, 62, info]) }
         / "jz" _ info:Label 							{ labelsUsed.push(info); codigos.push([lines, 63, info]) }
         / "pusha" _ info:Label 						{ labelsUsed.push(info); codigos.push([lines, 64, info]) }
       
       
       Inst_Atom = "stop" {return 0} / "start" {return 1} 
         / "add" {return 2} / "sub" {return 3} / "mul" {return 4} 
         / "div" {return 5} / "mod" {return 6} / "not" {return 7} 
         / "infeq" {return 9} / "inf" {return 8}  / "supeq" {return 11}
         / "sup" {return 10} / "fadd" {return 12} / "fsub" {return 13} 
         / "fmul" {return 14} / "fdiv" {return 15} / "fcos" {return 16} 
         / "fsin" {return 17} / "finfeq" {return 19} / "finf" {return 18} 
         / "fsupeq" {return 21}/ "fsup" {return 20}  / "concat" {return 22} 
         / "equal" {return 23} / "atoi" {return 24} / "atof" {return 25} 
         / "itof" {return 26} / "ftoi" {return 27} / "stri" {return 28} 
         / "strf" {return 29} / "pushsp" {return 30} / "pushfp" {return 31} 
         / "pushgp" {return 32} / "loadn" {return 33} / "storen" {return 34} 
         / "swap" {return 35} / "writei" {return 36} / "writef" {return 37} 
         / "writes" {return 38} / "read" {return 39} / "call" {return 40} 
         / "return" {return 41} / "allocn" {return 42} / "free" {return 43} 
         / "dupn" {return 44} / "popn" {return 45} / "padd" {return 46} 
         / "nop" {return 65} / "writeln" {return 66} / "and" {return 67} / "or" {return 68}
         / "chrcode" {return 69} 
         / "writechr" {return 70}
         / "strlen" {return 71}
         / "charat" {return 72}
         / "popst" {return 74}
         / "copyn" {return 75}

       
       Inst_Int = "pushi" {return 47} / "pushn" {return 48} / "pushg" {return 49} 
         / "pushl" {return 50} / "load" {return 51} / "dup" {return 52} / "pop" {return 53} 
         / "storel" {return 54} / "storeg" {return 55} / "store" {return 56} / "alloc" {return 57}
         / "pushst" {return 73} / "copy" {return 76}
       
       Comment = "//" [^\\n]*
       
       Label "label" = [a-zA-Z0-9]+ { return text(); }
       
       String = '"' info:Content*  '"' { return info.join('') }

       Content = "\\\\n"            {return "\\n"}
               / [^"]               {return text()}

       Integer "integer" = ("+"/"-")? _ [0-9]+ { return parseInt(text(), 10); }
       
       Float = ("+"/"-")? _ Integer(.Integer)? { return parseFloat(text(), 10); }
       
       _ "whitespace" = Space*
       
       Space = [\\n] { lines += 1 } 
             / [ \\t\\r] 
       `;
    }
 }