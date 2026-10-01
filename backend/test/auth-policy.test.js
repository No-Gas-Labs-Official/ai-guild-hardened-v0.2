import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authSource = await readFile(new URL('../routes/auth.js', import.meta.url), 'utf8');

test('public registration cannot accept caller-selected role', () => {
  assert.match(authSource, /const \{ username, email, password \} = req\.body;/);
  assert.match(authSource, /const role = ['"]user['"];/);
  assert.doesNotMatch(authSource, /const \{[^}]*role[^}]*\} = req\.body;/);
});

test('production JWT authority fails closed without JWT_SECRET', () => {
  assert.match(authSource, /process\.env\.NODE_ENV === ['"]production['"] \? null/);
  assert.match(authSource, /if \(!JWT_SECRET\)/);
  assert.match(authSource, /JWT_SECRET must be set when NODE_ENV=production/);
  assert.doesNotMatch(authSource, /process\.env\.JWT_SECRET \|\| ['"]nogaslabs-super-secret-key['"]/);
});
