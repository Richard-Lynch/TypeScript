/// <reference path='fourslash.ts' />
// @Filename: /a.ts
/////**
//// * hello
//// */
////function a() {
////}
////export { d }

// @Filename: /b.ts
////import { a, d } from "./a"

goTo.file("/b.ts");
verify.codeFixAvailable([
  { description: `Export 'a' from module './a'` },
  { description: `Remove import from './a'` },
]);
verify.codeFix({
  index: 0,
  description: `Export 'a' from module './a'`,
  newFileContent: {
    "/a.ts": `/**
 * hello
 */
export function a() {
}
export { d }`,
  },
});
