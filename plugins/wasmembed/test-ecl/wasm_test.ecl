import wasm;

integer4 gcd(integer4 val1, integer4 val2) := EMBED(wasm)  

  (func ('gcd') (param $val1 i32) (param $val2 i32) (result i32)
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

  (func ('add') (param f32 f32) (result f32)
    get_local 0
    get_local 1
    f32.add
  )

ENDEMBED;

boolean boolTest (boolean a, boolean b) := IMPORT(wasm, 'test.bool-test');
real4 float32Test (real4 a, real4 b) := IMPORT(wasm, 'test.float32-test');
real8 float64Test (real8 a, real8 b) := IMPORT(wasm, 'test.float64-test');
unsigned1 u8Test (unsigned1 a, unsigned1 b) := IMPORT(wasm, 'test.u8-test');
unsigned2 u16Test (unsigned2 a, unsigned2 b) := IMPORT(wasm, 'test.u16-test');
unsigned4 u32Test (unsigned4 a, unsigned4 b) := IMPORT(wasm, 'test.u32-test');
unsigned8 u64Test (unsigned8 a, unsigned8 b) := IMPORT(wasm, 'test.u64-test');
integer1 s8Test (integer1 a, integer1 b) := IMPORT(wasm, 'test.s8-test');
integer2 s16Test (integer2 a, integer2 b) := IMPORT(wasm, 'test.s16-test');
integer4 s32Test (integer4 a, integer4 b) := IMPORT(wasm, 'test.s32-test');
integer8 s64Test (integer8 a, integer8 b) := IMPORT(wasm, 'test.s64-test');
string stringTest (string a, string b) := IMPORT(wasm, 'test.string-test');
string7 string5Test (string5 a, string5 b) := IMPORT(wasm, 'test.string-test');
varstring varstringTest (varstring a, varstring b) := IMPORT(wasm, 'test.string-test');

boolTest(false, false) = (false AND false);
boolTest(false, true) = (false AND true);
boolTest(true, false) = (true AND false);
boolTest(true, true) = (true AND true);
float32Test(1.0, 2.0) = (1.0 + 2.0);
float64Test(1.0, 2.0) = (1.0 + 2.0);
u8Test(1, 2) = (1 + 2);
u16Test(1, 2) = (1 + 2);
u32Test(1, 2) = (1 + 2);
u64Test(1, 2) = (1 + 2);
s8Test(1, 2) = (1 + 2);
s16Test(1, 2) = (1 + 2);
s32Test(1, 2) = (1 + 2);
s64Test(1, 2) = (1 + 2);
stringTest('aaa', 'bbbb') = ('aaa' + 'bbbb');
varstringTest('aaa', 'bbbb') = ('aaa' + 'bbbb');
string5Test('aaa', 'bbbb') = (string7)((string5)'aaa' + (string5)'bbbb');
