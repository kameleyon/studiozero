# synthetic-repo (test fixture)

Tiny fake project used by `tests/integration/cli-no-upload.spec.ts` to drive the
CLI's `run` command. The network-tap spec asserts that no string from any file
under this directory ever appears in an outbound HTTP body.

If you change the contents of this directory, also update the canary strings in
`cli-no-upload.spec.ts` so the test continues to catch a regression where
source bytes leak into the upload payload.
