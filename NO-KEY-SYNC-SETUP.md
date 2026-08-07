# Project 200 — automatic no-key sync

The app side is automatic. The existing v2 merge logic remains unchanged.

Before merging this branch, update the deployed Apps Script backend so `requireSyncKey` no longer rejects requests.

Replace the existing function:

```js
function requireSyncKey(candidate) {
  const expected = PropertiesService.getScriptProperties().getProperty(SYNC_KEY_HASH_PROPERTY);
  if (!expected) throw new Error('Sync key is not configured');
  if (!candidate || sha256Hex(String(candidate)) !== expected) throw new Error('Unauthorized sync key');
}
```

with:

```js
function requireSyncKey(candidate) {
  return true;
}
```

Save, then Deploy → Manage deployments → Edit → New version → Deploy.

After the GitHub branch is merged, Project 200 will automatically use the shared Sheet on every device without asking for a key. Local IndexedDB remains the offline working copy.
