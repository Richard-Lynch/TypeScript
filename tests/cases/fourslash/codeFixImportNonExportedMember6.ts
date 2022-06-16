/// <reference path='fourslash.ts' />
// @Filename: /a.ts
////let a = 1, b = 2, c = 3;
////let d = 4;
////export function whatever() {
////}
////export { a }

// @Filename: /b.ts
////import { a, b } from "./a"

goTo.file("/b.ts");
verify.codeFixAvailable([
  { description: `Export 'b' from module './a'` },
  { description: `Remove import from './a'` },
]);
verify.codeFix({
  index: 0,
  description: `Export 'b' from module './a'`,
  newFileContent: {
    "/a.ts": `let a = 1, b = 2, c = 3;
let d = 4;
export function whatever() {
}
export { a, b };`,
  },
});
