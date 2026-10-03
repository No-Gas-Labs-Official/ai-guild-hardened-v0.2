const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const authSource = readFileSync(join(__dirname, '../routes/auth.js'), 'utf8');

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
