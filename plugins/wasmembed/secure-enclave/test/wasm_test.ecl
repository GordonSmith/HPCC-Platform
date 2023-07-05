import wasm;

integer4 gcd(integer4 val1, integer4 val2) := EMBED(wasm)  

  (func (export "gcd") (param $val1 i32) (param $val2 i32) (result i32)
    (local i32)
    block ;; label = $val1
      block ;; label = $val2
        local.get 0
        br_if 0 (;$val2;)
        local.get 1
        local.set 2
        br 1 (;$val1;)
      end
      loop ;; label = $val2
        local.get 1
        local.get 0
        local.tee 2
        i32.rem_u
        local.set 0
        local.get 2
        local.set 1
        local.get 0
        br_if 0 (;$val2;)
      end
    end
    local.get 2
  )

ENDEMBED;

real4 inlineAdd(real4 val1, real4 val2) := EMBED(wasm)  
  
  (func (export "add") (param f32 f32) (result f32)
    get_local 0
    get_local 1
    f32.add
  )

ENDEMBED;

integer4 add3 (integer4 val1) := IMPORT( wasm, 'test.add3' );
integer4 add (integer4 val1, integer4 val2) := IMPORT( wasm, 'test.add' );
integer4 sub (integer4 val1, integer4 val2) := IMPORT( wasm, 'test.sub' );

inlineAdd(10.12, 21.22);
add3(10);
inlineAdd(10.22, 22.22);
add(10,2);
add(10,2);
inlineAdd(10.12, 21.22);
add(10,2);
add(10,3);
// inlineAdd(10, 22);
// addB(12, 16);
gcd(10, 15);
// addB(10, 15);
// add(12, 16);
// gcd(12, 9);
// addB(12, 9);
// sub(44, 2);
// sub(44, 3);
// sub(44, 4);
// sub(44, 5);
// sub(44, 6);
