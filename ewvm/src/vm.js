module.exports = {
    isNumber: function(x){
      return typeof x === 'number'
    },
    isString: function(x){
      return typeof x === 'string'
    },
    toRef: function(type, x){
      return type.concat('#').concat(x.toString())
    },
    changeStructRefIndex: function(x, index){
      var ref = x.split('#')
      ref[2] = index
      return ref.join('#')
    },
    getRef: function(x){
      if (!this.isString(x)) return [0]
      var ref = x.split('#')
      var type = ref[0]
      if (type === 'struct') return [ type, parseInt(ref[1]), parseInt(ref[2]) ]
      else if (type === 'stack' || type === "code" || type === 'string') return [ type, parseInt(ref[1]) ]
      else return [0]
    },
    putString: function(string_heap, x){
      string_heap.push(x.substring(0, 100))
      return this.toRef("string", string_heap.length-1)
    },
    putStruct: function(struct_heap, x){
      struct_heap.push(x)
      return this.toRef("struct", (struct_heap.length-1).toString().concat('#0') )
    },
    animationError: function(animation){
      for(var i=0; i < animation.length-1; i++) animation[i][6] = [-1,0]
      animation[animation.length-1][6] = [0,1]
    },

    run: function(input, code, pointer_code, call_stack, operand_stack, frame_pointer, string_heap, struct_heap, animation, terminal_length) {

      var code_stack = code
      var stop = 0
      var error = ''
      var result = []
      var read = 0
      var fp_initialized = -1

      let nr_instructions = 0
      const max_instructions = 10000

      // stack input read
      if (input != null){
        operand_stack.push(this.putString(string_heap, input))
        animation[animation.length-1][1] = operand_stack.slice(0)
        animation[animation.length-1][3] = string_heap.slice(0)
        fp_initialized = animation[animation.length-1][5]
      }

      // execute the code
      for (; pointer_code < code_stack.length && nr_instructions < max_instructions ; pointer_code++, nr_instructions++){
        var result_length = result.length
        c = code[pointer_code]

        if (!stop && !read && error===''){

          var line = c[0]
          var instruction = c[1]

          switch(instruction){
            case 0: //stop                  
              stop = 1
              break
            case 1: //start  
              frame_pointer = operand_stack.length 
              fp_initialized = 1
              break
            case 2: //add
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push(m + n)
                else error = 'Illegal Operand: add - elements not Integer'
              } else error = 'Segmentation Fault: add - elements missing'
              break
            case 3: //sub
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push(m - n)
                else error = 'Illegal Operand: sub - elements not Integer'
              } else error = 'Segmentation Fault: sub - elements missing'
              break
            case 4: //mul
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push(m * n)
                else error = 'Illegal Operand: mul - elements not Integer'
              } else error = 'Segmentation Fault: mul - elements missing'
              break
            case 5: //div
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if (n == 0) error = 'Division By Zero: div'
                else if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push((m / n) | 0)
                else error = 'Illegal Operand: div - elements not Integer'
              } else error = 'Segmentation Fault: div - elements missing'
              break
            case 6: //mod
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push(m % n)
                else error = 'Illegal Operand: mod - elements not Integer'
              } else error = 'Segmentation Fault: mod - elements missing'
              break

            case 7: //not                  
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if(Number.isInteger(n))
                  operand_stack.push( +(n == 0) )
                else error = 'Illegal Operand: not - element not Integer'
              } else error = 'Segmentation Fault: not - elements missing'
              break
            case 8: //inf
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push( +(m < n) )
                else error = 'Illegal Operand: inf - elements not Integer'
              } else error = 'Segmentation Fault: inf - elements missing'
              break
            case 9: //infeq
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push( +(m <= n) )
                else error = 'Illegal Operand: infeq - elements not Integer'
              } else error = 'Segmentation Fault: infeq - elements missing'
              break
            case 10: //sup
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push( +(m > n) )
                else error = 'Illegal Operand: sup - elements not Integer'
              } else error = 'Segmentation Fault: sup - elements missing'
              break
            case 11: //supeq
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(Number.isInteger(n) && Number.isInteger(m))
                  operand_stack.push( +(m >= n) )
                else error = 'Illegal Operand: supeq - elements not Integer'
              } else error = 'Segmentation Fault: supeq - elements missing'
              break

            case 12: //fadd
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(this.isNumber(n) && this.isNumber(m))
                  operand_stack.push(m + n)
                else error = 'Illegal Operand: fadd - elements not Real Number' 
              } else error = 'Segmentation Fault: fadd - elements missing'
              break           
            case 13: //fsub
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(this.isNumber(n) && this.isNumber(m))
                  operand_stack.push(m - n)
                else error = 'Illegal Operand: fsub - elements not Real Number'
              } else error = 'Segmentation Fault: fsub - elements missing'
              break
            case 14: //fmul
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(this.isNumber(n) && this.isNumber(m))
                  operand_stack.push(m * n)
                else error = 'Illegal Operand: fmul - elements not Real Number'
              } else error = 'Segmentation Fault: fmul - elements missing'
              break
            case 15: //fdiv
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(this.isNumber(n) && this.isNumber(m))
                  operand_stack.push(m / n)
                else error = 'Illegal Operand: fdiv - elements not Real Number'
              } else error = 'Segmentation Fault: div - elements missing'
              break

            case 16: //fcos
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if(this.isNumber(n))
                  operand_stack.push( Math.cos(n) )
                else error = 'Illegal Operand: fcos - element not Real Number'
              } else error = 'Segmentation Fault: fcos - elements missing'
              break
            case 17: //fsin
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if(this.isNumber(n))
                  operand_stack.push( Math.sin(n) )
                else error = 'Illegal Operand: fsin - element not Real Number'
              } else error = 'Segmentation Fault: fsin - elements missing'
              break
              
            case 18: //finf
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(this.isNumber(n) && this.isNumber(m))
                  operand_stack.push( +(m < n) )
                else error = 'Illegal Operand: finf - elements not Real Number'  
              } else error = 'Segmentation Fault: finf - elements missing'
              break          
            case 19: //finfeq
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(this.isNumber(n) && this.isNumber(m))
                  operand_stack.push( +(m <= n) )
                else error = 'Illegal Operand: finfeq - elements not Real Number'
              } else error = 'Segmentation Fault: finfeq - elements missing'
              break
            case 20: //fsup
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(this.isNumber(n) && this.isNumber(m))
                  operand_stack.push( +(m > n) )
                else error = 'Illegal Operand: fsup - elements not Real Number'
              } else error = 'Segmentation Fault: fsup - elements missing'
              break
            case 21: //fsupeq
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if(this.isNumber(n) && this.isNumber(m))
                  operand_stack.push( +(m >= n) )
                else error = 'Illegal Operand: fsupeq - elements not Real Number'
              } else error = 'Segmentation Fault: fsupeq - elements missing'
              break

            case 22: //concat
              if (operand_stack.length >= frame_pointer + 2){
                var s1 = this.getRef( operand_stack.pop() )
                var s2 = this.getRef( operand_stack.pop() )
                if( s1[0] === "string" && s2[0] === "string" )
                  operand_stack.push( this.putString( string_heap, string_heap[s1[1]].concat(string_heap[s2[1]])) )
                else error = 'Illegal Operand: concat - elements not String'
              } else error = 'Segmentation Fault: concat - elements missing'
              break

            case 23: //equal
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                operand_stack.push( +(m == n) )
              } else error = 'Segmentation Fault: equal - elements missing'
              break

            case 24: //atoi
              if (operand_stack.length >= frame_pointer + 1){
                var s = this.getRef( operand_stack.pop() )
                if(s[0] === "string"){
                  i = parseInt(string_heap[s[1]])
                  if (Number.isInteger(i)) operand_stack.push(i)
                  else error = 'Illegal Operand: atoi - String does not represent Integer'
                }
                else error = 'Illegal Operand: atoi - element not String Reference'
              } else error = 'Segmentation Fault: atoi - elements missing'
              break
            case 25: //atof
              if (operand_stack.length >= frame_pointer + 1){
                var s = this.getRef( operand_stack.pop() )
                if(s[0] === "string"){
                  i = parseFloat(string_heap[s[1]])
                  if (i!=NaN) operand_stack.push(i)
                  else error = 'Illegal Operand: atof - String does not represent Real Number'
                }
                else error = 'Illegal Operand: atof - element not String Reference'
              } else error = 'Segmentation Fault: atof - elements missing'
              break
              
            case 26: //itof
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if(Number.isInteger(n))
                  operand_stack.push( parseFloat(n) )
                else error = 'Illegal Operand: itof - element not Integer'
              } else error = 'Segmentation Fault: itof - elements missing'
              break
            case 27: //ftoi
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if(this.isNumber(n))
                  operand_stack.push( parseInt(n) )
                else error = 'Illegal Operand: ftoi - element not Real Number'
              } else error = 'Segmentation Fault: ftoi - elements missing'
              break

            case 28: //stri
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if(Number.isInteger(n))
                  operand_stack.push( this.putString(string_heap, n.toString()) )
                else error = 'Illegal Operand: stri - element not Integer'
              } else error = 'Segmentation Fault: stri - elements missing'
              break
            case 29: //strf
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if(this.isNumber(n))
                  operand_stack.push( this.putString(string_heap, n.toString()) )
                else error = 'Illegal Operand: strf - element not Real Number'
              } else error = 'Segmentation Fault: strf - elements missing'
              break

            case 30: //pushsp
              operand_stack.push( this.toRef("stack", operand_stack.length - 1) )
              break
            case 31: //pushfp
              operand_stack.push( this.toRef("stack", frame_pointer) )
              break
            case 32: //pushgp
              operand_stack.push( this.toRef("stack", 0) )
              break

            case 33: //loadn
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var a = operand_stack.pop()
                var ref = this.getRef(a)
                if (ref[0] === "stack")
                  operand_stack.push( operand_stack[ref[1]+n] )
                else if (ref[0] === "struct"){                                      // heap
                  var struct = struct_heap[ref[1]]
                  var index = ref[2] + n
                  if (struct.length > index && index >= 0) operand_stack.push( struct[index] )
                  else error = "Segmentation Fault: loadn - index out of Struct"
                } else error = 'Illegal Operand: loadn - element not Address'
              } else error = 'Segmentation Fault: loadn - elements missing'
              break
            case 34: //storen
              if (operand_stack.length >= frame_pointer + 3){
                var v = operand_stack.pop()
                var n = operand_stack.pop()
                var a = operand_stack.pop()
                var ref = this.getRef(a)
                var r = this.getRef(v)
                if (r[0] !== 'stack' && r[0] !== 'code' && r[0] !== 'struct')
                  if (ref[0] === "stack")
                    operand_stack[ref[1]+n] = v
                  else if (ref[0] === "struct"){                                    // heap
                    var struct = struct_heap[ref[1]]
                    var index = ref[2] + n
                    if (struct.length > index && index >= 0) struct[index] = v
                    else error = "Segmentation Fault: storen - index out of Struct"
                  } else error = "Illegal Operand: storen - element not Address"
                else error = "Illegal Operand: storen - element not Integer, Float or String"
              } else error = 'Segmentation Fault: storen - elements missing'
              break

            case 35: //swap
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                operand_stack.push(n)
                operand_stack.push(m)
              } else error = 'Segmentation Fault: swap - elements missing'
              break

            case 36: //writei
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if (Number.isInteger(n))
                  result.push( n.toString() )
                else error = 'Illegal Operand: writei - element not Integer'
              } else error = 'Segmentation Fault: writei - elements missing'
              break
            case 37: //writef
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if (this.isNumber(n))
                  result.push( n.toString() )
                else error = 'Illegal Operand: writef - element not Real Number'
              } else error = 'Segmentation Fault: writef - elements missing'
              break
            case 38: //writes
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                var ref = this.getRef(n)
                if (ref[0] === "string")
                  result.push( string_heap[ref[1]] )
                else error = 'Illegal Operand: writes - element not String Reference'
              } else error = 'Segmentation Fault: writes - elements missing'
              break
            case 39: //read                                                 // interaction
              read = 1
              break

            case 40: //call                                                 // call stack
            if (operand_stack.length >= frame_pointer + 1){
                var ref = this.getRef( operand_stack.pop() )
                if (ref[0] === "code"){
                  call_stack.push([pointer_code, frame_pointer])
                  pointer_code = ref[1] - 1
                  frame_pointer = operand_stack.length
                  fp_initialized = 1

                } else error = 'Illegal Operand: call - element not Label' 
              } else error = 'Segmentation Fault: call - elements missing'
              break
            case 41: //return                                               // call stack 
              if (call_stack.length >= 1){
                var called = call_stack.pop()
                pointer_code = called[0] 
                frame_pointer = called[1]
                fp_initialized = 1
              } else error = 'Segmentation Fault: return - elements missing'
              break

            case 42: //allocn                                               // heap
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                var struct = []
                struct.length = n
                operand_stack.push( this.putStruct(struct_heap, struct) )
              } else error = 'Segmentation Fault: allocn - elements missing'
              break
            case 43: //free                                                 // heap
              if (operand_stack.length >= frame_pointer + 1){
                var a = operand_stack.pop()
                if (Array.isArray(a))
                  a = null
                else if (a == null)
                  error = 'Illegal Operand: free - element null'
                else
                  error = 'Illegal Operand: free - element not Struct Address'
              } else error = 'Segmentation Fault: free - elements missing'
              break

            case 44: //dupn
              if (operand_stack.length >= frame_pointer + 2){
                const n = operand_stack.pop()
                const v = operand_stack.pop()
                  for (let i=0; i < n; i++){
                    operand_stack.push(v)
                  }
              } else error = 'Segmentation Fault: dupn - elements missing'
              break
            case 45: //popn
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if (operand_stack.length >= frame_pointer + n)
                  for (let i=0; i < n; i++)
                    operand_stack.pop()
                else error = 'Segmentation Fault: popn - elements missing'
              } else error = 'Segmentation Fault: popn - elements missing'
              break

            case 46: //padd
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var a = operand_stack.pop()
                var ref = this.getRef(a)
                if (ref[0] === "stack")
                  operand_stack.push( this.toRef("stack", ref[1]+n) )
                else if (ref[0] === "struct") {                                      // heap
                  var struct = struct_heap[ref[1]]
                  var index = ref[2] + n
                  if (struct.length > index && index >= 0) operand_stack.push( this.changeStructRefIndex(a, index) )
                  else error = 'Segmentation Fault: padd - index out of Struct'
                } else error = 'Illegal Operand: padd - element not Address'
              } else error = 'Segmentation Fault: padd - elements missing'
              break

            case 47: //pushi
              operand_stack.push(c[2])
              break
            case 48: //pushn
              for (let i=0; i < c[2]; i++)
                operand_stack.push(0)
              break
            case 49: //pushg
              if (operand_stack.length >= c[2])
                operand_stack.push( operand_stack[c[2]] )
              else error = 'Segmentation Fault: pushg - elements missing'
              break
            case 50: //pushl
              if (operand_stack.length >= frame_pointer + c[2])
                operand_stack.push( operand_stack[frame_pointer+c[2]] )
              else error = 'Segmentation Fault: pushg - elements missing'
              break

            case 51: //load
              if (operand_stack.length >= frame_pointer + 1){
                var a = operand_stack.pop()
                var ref = this.getRef(a)
                if (ref[0] === "stack")
                  operand_stack.push( operand_stack[ref[1]+c[2]] )
                else if (ref[0] === "struct"){                                       // heap
                  var struct = struct_heap[ref[1]]
                  var index = ref[2] + c[2]
                  if (struct.length > index) operand_stack.push( struct[index] )
                  else error = 'Segmentation Fault: load - index out of Struct'
                } else error = 'Illegal Operand: load - element not Address'
              } else error = 'Segmentation Fault: load - elements missing'
              break

            case 52: //dup
              if (operand_stack.length >= frame_pointer + 1){
                const v = operand_stack.pop();
                for (let i=0; i < c[2]; i++){
                  operand_stack.push(v)
                }
              } else error = 'Segmentation Fault: dup - elements missing'
              break
            case 53: //pop
              if (operand_stack.length >= frame_pointer + c[2]){
                for (let i=0; i < c[2]; i++)
                  operand_stack.pop()
              } else error = 'Segmentation Fault: pop - elements missing'
              break

            case 54: //storel
              if (operand_stack.length >= frame_pointer + 1){
                var v = operand_stack.pop()
                operand_stack[frame_pointer+c[2]] = v
              } else error = 'Segmentation Fault: storel - elements missing'
              break
            case 55: //storeg
              if (operand_stack.length >= frame_pointer + 1){
                var v = operand_stack.pop()
                operand_stack[c[2]] = v
              } else error = 'Segmentation Fault: storeg - elements missing'
              break
            case 56: //store
              if (operand_stack.length >= frame_pointer + 2){
                var v = operand_stack.pop()
                var a = operand_stack.pop()
                var ref = this.getRef(a)
                if (ref[0] === "stack")
                  operand_stack[ ref[1]+c[2] ] = v
                else if (ref[0] === "struct"){                                       // heap
                  var struct = struct_heap[ref[1]]
                  var index = ref[2] + c[2]
                  if (struct.length > index) struct[index] = v
                  else error = "Segmentation Fault: store - index out of Struct"
                } else error = "Illegal Operand: store - element not Address"
              } else error = 'Segmentation Fault: store - elements missing'
              break

            case 57: //alloc                                                  // heap
              var struct = []
              struct.length = c[2]
              operand_stack.push( this.putStruct(struct_heap, struct) )
              break

            case 58: //pushf
              operand_stack.push(c[2])
              break
            case 59: //pushs
              operand_stack.push( this.putString( string_heap, c[2] ) )
              break

            case 60: //err
              error = "Error: ".concat(c[2])
              break

            case 61: //check
              if (operand_stack.length >= frame_pointer + 1){
                var v = operand_stack.pop()
                operand_stack.push(v)
                if ( !(c[2] <= v && v <= c[3]) )
                  error = 'Illegal Operand: check - element not between given values' 
              } else error = 'Segmentation Fault: check - elements missing'
              break

            case 62: //jump
              var ref = this.getRef(c[2])
              pointer_code = ref[1] - 1
              break
            case 63: //jz
              if (operand_stack.length >= frame_pointer + 1){
                if (operand_stack.pop() === 0){
                  var ref = this.getRef(c[2])
                  pointer_code = ref[1] - 1
                }
              } else error = 'Segmentation Fault: jz - elements missing'
              break
            case 64: //pusha
              operand_stack.push( c[2] )
              break

            case 65: //nop
              break

            case 66: //writeln
              result.push( "\n" )
              break
            
            case 67: //and
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if (this.isNumber(n) && this.isNumber(m)) 
                  if (n && m) operand_stack.push( 1 )
                  else operand_stack.push( 0 )
                else error = 'Illegal Operand: and - element not Number'
              } else error = 'Segmentation Fault: and - elements missing'
              break

            case 68: //or
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                if (this.isNumber(n) && this.isNumber(m)) 
                  if (n || m) operand_stack.push( 1 )
                  else operand_stack.push( 0 )
                else error = 'Illegal Operand: or - element not Number'
              } else error = 'Segmentation Fault: or - elements missing'
              break

            case 69: //chrcode
              if (operand_stack.length >= frame_pointer + 1) {
                var n = operand_stack.pop()
                var ref = this.getRef(n)
                var string = string_heap[ref[1]]
                if (ref[0] === "string" && string.length > 0)
                  operand_stack.push(string.charCodeAt(0))
                else if (ref[0] === "string")
                  error = 'Illegal Operand: chrcode - empty String'
                else
                  error = 'Illegal Operand: chrcode - element not String Reference'
              } else error = 'Segmentation Fault: chrcode - elements missing'
              break
  
            case 70: //writechr
              if (operand_stack.length >= frame_pointer + 1) {
                var n = operand_stack.pop()
                if (Number.isInteger(n))
                  result.push(String.fromCharCode(n))
                else error = 'Illegal Operand: writechr - element not Integer'
              } else error = 'Segmentation Fault: writechr - elements missing'
              break
  
            case 71: //strlen
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                var ref = this.getRef(n)
                if (ref[0] === "string") {
                  var string = string_heap[ref[1]]
                  operand_stack.push(string.length)
                }
                else
                  error = 'Illegal Operand: strlen - element not String Reference'
              } else error = 'Segmentation Fault: strlen - elements missing'
              break

            case 72: //charat
              if (operand_stack.length >= frame_pointer + 2){
                var n = operand_stack.pop()
                var m = operand_stack.pop()
                var ref = this.getRef(m)
                if (this.isNumber(n) && ref[0] === "string") {
                  var string = string_heap[ref[1]]
                  if (string.length > n && n >= 0)
                    operand_stack.push(string.charCodeAt(n))
                  else
                    error = "Segmentation Fault:  - elements missing (string too short)"
                }
                else
                  error = 'Illegal Operand: charat - elements not Number and String Reference'
              } else error = 'Segmentation Fault:  - elements missing'
              break

            case 73: //pushst
              var n = c[2]
              if (n < struct_heap.length) {
                operand_stack.push(this.toRef("struct", n.toString().concat('#0')))
              } else
                error = 'Illegal Operand: pushst - index out of range of Struct Heap'
              break

            case 74: // popst
              if (struct_heap.length >= 1) {
                struct_heap.pop()
              } else
                error = 'Segmentation Fault: popst - elements missing'
              break

            case 75: // copyn
              if (operand_stack.length >= frame_pointer + 1){
                var n = operand_stack.pop()
                if (operand_stack.length >= frame_pointer + n){
                  var values = []
                  for (let i=0; i < n; i++){
                    var v = operand_stack.pop()
                    values.push(v)
                  }
                  values = [...values, ...values]
                  for (var i = values.length - 1; i >= 0; i--)
                    operand_stack.push(values[i])
                } else error = 'Segmentation Fault: copyn - elements missing'
              } else error = 'Segmentation Fault: copyn - elements missing'
              break

            case 76: // copy
              var values = []
              if (operand_stack.length >= frame_pointer + c[2]){
                for (let i=0; i < c[2]; i++){
                  var v = operand_stack.pop()
                  values.push(v)
                }
                values = [...values, ...values]
                for (var i = values.length - 1; i >= 0; i--)
                  operand_stack.push(values[i])
              } else error = 'Segmentation Fault: copy - elements missing'
              break

            
            default: 
              error = 'Anomaly: Default case'
          }
          var fpointer = -1
          if (fp_initialized > -1 || frame_pointer != 0) fpointer = frame_pointer
          var terminal_index = [terminal_length + result.length, result.length - result_length]
          animation.push([line, operand_stack.slice(0), call_stack.slice(0), string_heap.slice(0), struct_heap.slice(0), fpointer, terminal_index])
        }
        else break
      }
      if (nr_instructions >= max_instructions) error =
          `ERROR: Max instructions reached (${max_instructions}). Step-by-step will be limited to 200 iterations. Possible cause: infinite loop.`

      if (error != ''){
        this.animationError(animation)
        animation = animation.slice(0, 200)
        return [0, error, pointer_code, call_stack, operand_stack, frame_pointer, string_heap, struct_heap, animation]
      }
      return [read, result, pointer_code, call_stack, operand_stack, frame_pointer, string_heap, struct_heap, animation]
    }
 }