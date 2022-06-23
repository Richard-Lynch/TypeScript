/// <reference path='fourslash.ts' />
// @Filename: /a.ts
////class a{};
////class b{}, class c{};

// @Filename: /b.ts
////import { a, b, c } from "./a"

goTo.file("/b.ts");
verify.codeFixAvailable([
  { description: `Export 'a' from module './a'` },
  { description: `Export 'b' from module './a'` },
  { description: `Export 'c' from module './a'` },
  { description: `Remove import from './a'` },
]);
// Can export a class
verify.codeFix({
  index: 0,
  description: `Export 'a' from module './a'`,
  newFileContent: {
    "/a.ts": `export class a{};
class b{}, class c{};`,
  },
});

// Can export first class in list
verify.codeFix({
  index: 0,
  description: `Export 'b' from module './a'`,
  newFileContent: {
    "/a.ts": `class a{};
export class b{}, class c{};`,
  },
});

// Can export second class in list
verify.codeFix({
  index: 0,
  description: `Export 'c' from module './a'`,
  newFileContent: {
    "/a.ts": `class a{};
class b{}, export class c{};`,
  },
});