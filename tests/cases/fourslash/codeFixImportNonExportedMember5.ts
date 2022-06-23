/// <reference path='fourslash.ts' />
// @Filename: /a.ts
/////**
//// * foo
//// */
////function a() {
////}
/////**
//// * bar
//// */
////let b = 4;

// @Filename: /b.ts
////import { a, b } from "./a"

goTo.file("/b.ts");
verify.codeFixAvailable([
  { description: `Export 'a' from module './a'` },
  { description: `Export 'b' from module './a'` },
  { description: `Remove import from './a'` },
]);
// Doesn't clobber jsdoc on functions
verify.codeFix({
  index: 0,
  description: `Export 'a' from module './a'`,
  newFileContent: {
    "/a.ts": `/**
 * foo
 */
export function a() {
}
/**
 * bar
 */
let b = 4;`,
  },
});
