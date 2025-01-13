import wasm;

boolean boolAndTest (boolean a, boolean b) := IMPORT(wasm, 'wasmembed.bool-and');
boolean boolOrTest (boolean a, boolean b) := IMPORT(wasm, 'wasmembed.bool-or');
real4 f32Test (real4 a, real4 b) := IMPORT(wasm, 'wasmembed.f32-add');
real8 f64Test (real8 a, real8 b) := IMPORT(wasm, 'wasmembed.f64-add');
unsigned1 u8Test (unsigned1 a, unsigned1 b) := IMPORT(wasm, 'wasmembed.u8-add');
unsigned2 u16Test (unsigned2 a, unsigned2 b) := IMPORT(wasm, 'wasmembed.u16-add');
unsigned4 u32Test (unsigned4 a, unsigned4 b) := IMPORT(wasm, 'wasmembed.u32-add');
unsigned8 u64Test (unsigned8 a, unsigned8 b) := IMPORT(wasm, 'wasmembed.u64-add');
integer1 s8Test (integer1 a, integer1 b) := IMPORT(wasm, 'wasmembed.s8-add');
integer2 s16Test (integer2 a, integer2 b) := IMPORT(wasm, 'wasmembed.s16-add');
integer4 s32Test (integer4 a, integer4 b) := IMPORT(wasm, 'wasmembed.s32-add');
integer8 s64Test (integer8 a, integer8 b) := IMPORT(wasm, 'wasmembed.s64-add');

string stringTest (string a, string b) := IMPORT(wasm, 'wasmembed.utf8-string-append');
string12 string5Test (string5 a, string5 b) := IMPORT(wasm, 'wasmembed.utf8-string-append');
varstring varstringTest (varstring a, varstring b) := IMPORT(wasm, 'wasmembed.utf8-string-append');
unicode12 unicode5Test (unicode5 a, unicode5 b) := IMPORT(wasm, 'wasmembed.utf8-string-append');
unicode unicodeTest (unicode a, unicode b) := IMPORT(wasm, 'wasmembed.utf8-string-append');
utf8_12 utf8_5Test (utf8_5 a, utf8_5 b) := IMPORT(wasm, 'wasmembed.utf8-string-append');
utf8 utf8Test (utf8 a, utf8 b) := IMPORT(wasm, 'wasmembed.utf8-string-append');

set of boolean listTestBoolean () := IMPORT(wasm, 'wasmembed.list-generate-bool');
set of boolean listBooleanTestBoolean (set of boolean a) := IMPORT(wasm, 'wasmembed.list-reverse-bool');
set of unsigned4 listTestU32 () := IMPORT(wasm, 'wasmembed.list-generate-u32');
set of unsigned4 listU32TestU32 (set of unsigned4 a) := IMPORT(wasm, 'wasmembed.list-reverse-u32');
set of real4 listTestf32 () := IMPORT(wasm, 'wasmembed.list-generate-f32');
set of real4 listf32Testf32 (set of real4 a) := IMPORT(wasm, 'wasmembed.list-reverse-f32');
set of string listTestString () := IMPORT(wasm, 'wasmembed.list-generate-string');
set of string listStringTestString (set of string a) := IMPORT(wasm, 'wasmembed.list-reverse-string');

listTestBoolean() = [true, false, true, false, true, false, true, false];
listBooleanTestBoolean([false, false, true, true, false, true]) = [true, false, true, true, false, false];

listTestf32() = [(real4)0.33, (real4)1.33, (real4)2.33, (real4)3.33];
listf32Testf32([1.23, 2.34, 3.45, 4.56]) = [(real4)4.56, (real4)3.45, (real4)2.34, (real4)1.23];

listTestU32() = [0, 1, 2, 3];
listU32TestU32([0, 1, 2, 3]) = [3, 2, 1, 0];

listTestString()=['test-0', 'test-1', 'test-2', 'test-3'];
listStringTestString(['aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff', 'ggg', 'hhh', 'iii']) = ['iii', 'hhh', 'ggg', 'fff', 'eee', 'ddd', 'ccc', 'bbb', 'aaa'];

// '--- bool ---';
boolAndTest(false, false) = (false AND false);
boolAndTest(false, true) = (false AND true);
boolAndTest(true, false) = (true AND false);
boolAndTest(true, true) = (true AND true);
boolOrTest(false, false) = (false OR false);
boolOrTest(false, true) = (false OR true);
boolOrTest(true, false) = (true OR false);
boolOrTest(true, true) = (true OR true);
// '--- float ---';
ROUND(f32Test((real4)1234.1234, (real4)2345.2345), 3) = ROUND((real4)((real4)1234.1234 + (real4)2345.2345), 3);
f64Test(123456789.123456789, 23456789.23456789) = (real8)((real8)123456789.123456789 + (real8)23456789.23456789);
// '--- unsigned ---';
u8Test(1, 2) = (unsigned1)(1 + 2);
u8Test(254, 1) = (unsigned1)(254 + 1);
u16Test(1, 2) = (unsigned2)(1 + 2);
u16Test(65534, 1) = (unsigned2)(65534 + 1);
u32Test(1, 2) = (unsigned4)(1 + 2);
u32Test(4294967294, 1) = (unsigned4)(4294967294 + 1);
u64Test(1, 2) = (unsigned8)(1 + 2);
u64Test(18446744073709551614, 1) = (unsigned8)(18446744073709551614 + 1);
// '--- signed ---';
s8Test(1, 2) = (integer1)(1 + 2);
s8Test(126, 1) = (integer1)(126 + 1);
s8Test(-127, -1) = (integer1)(-127 - 1);

s16Test(1, 2) = (integer2)(1 + 2);
s16Test(32766, 1) = (integer2)(32766 + 1);
s16Test(-32767, -1) = (integer2)(-32767 - 1);

s32Test(1, 2) = (integer4)(1 + 2);
s32Test(2147483646, 1) = (integer4)(2147483646 + 1);
s32Test(-2147483647, -1) = (integer4)(-2147483647 - 1);

s64Test(1, 2) = (integer8)(1 + 2);
s64Test(9223372036854775806, 1) = (integer8)(9223372036854775806 + 1);
s64Test(-9223372036854775807, -1) = (integer8)(-9223372036854775807 - 1);
// '--- string ---';
varstringTest('1234567890', 'abcdefghij') = '1234567890' + 'abcdefghij';
varstringTest('1234567890', 'abcdefghij');
varstringTest('abcdefghij', '1234567890');
stringTest('1234567890', 'abcdefghij') = '1234567890' + 'abcdefghij';
unicodeTest(U'1234567890您好1231231230', U'abcdefghij欢迎光临abcdefghij') = U'1234567890您好1231231230' + U'abcdefghij欢迎光临abcdefghij';
utf8Test(U8'您好', U8'欢迎光临') = U8'您好' + U8'欢迎光临';
// '--- string (fixed length) ---';
string5Test('1234567890', 'abcdefghij') = (string12)((string5)'1234567890' + (string5)'abcdefghij');
utf8_5Test(U8'您好1234567890', U8'欢迎光临abcdefghij') = (utf8_12)((utf8_5)U8'您好1234567890' + (utf8_5)U8'欢迎光临abcdefghij');
unicode5Test(U'您好1234567890', U'欢迎光临abcdefghij') = (unicode12)((unicode5)U'您好1234567890' + (unicode5)U'欢迎光临abcdefghij');
// '--- reentry ---';
r := RECORD
  unsigned1 kind;
  string20 word;
  unsigned8 doc;
  unsigned1 segment;
  unsigned8 wpos;
 END;
d := dataset('~regress::multi::searchsource', r, THOR);

r2 := RECORD(r)
  unsigned8 newUnsigned;
  string newWord;
  boolean passed;
END;

r2 t(r L) := TRANSFORM
  SELF.newUnsigned :=  u64Test(L.doc, L.wpos);
  boolean a := SELF.newUnsigned = (unsigned8)(L.doc + L.wpos);
  SELF.newWord := stringTest(L.word, L.word);
  boolean b := SELF.newWord = L.word + L.word;
  SELF.passed := a and B;
  SELF := L;
END;

r2 t2(r L) := TRANSFORM
  SELF.newUnsigned :=  u64Test(L.doc, L.wpos);
  boolean a := SELF.newUnsigned = L.doc+ L.wpos;
  SELF.newWord := L.word + L.word;
  boolean b := SELF.newWord = L.word + L.word;
  SELF.passed := a and B;
  SELF := L;
END;

r2 t3(r L) := TRANSFORM
  SELF.newUnsigned := L.doc+ L.wpos;
  boolean a := SELF.newUnsigned = L.doc+ L.wpos;
  SELF.newWord := L.word + L.word;
  boolean b := SELF.newWord = L.word + L.word;
  SELF.passed := a and B;
  SELF := L;
END;

unsigned sampleSize := 10000;
d2 := project(choosen(d, sampleSize), t(LEFT));
d3 := project(choosen(d, sampleSize, 5000), t(LEFT));
d4 := project(choosen(d, sampleSize, 10001), t(LEFT));
count(d2(passed=false)) = 0 AND count(d3(passed=false)) = 0 AND count(d4(passed=false)) = 0;
// '--- --- ---';
