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

real4 add(real4 val1, real4 val2) := EMBED(wasm)  

  (func (export "add") (param f32 f32) (result f32)
    get_local 0
    get_local 1
    f32.add
  )

ENDEMBED;

real4 sub (real4 val1, real4 val2) := IMPORT( wasm, 'test.sub' );

gcd(12, 16);
gcd(10, 15);
add(12, 16);
add(10, 15);
gcd(12, 9);
add(12, 9);
sub(44.44, 2.44);
