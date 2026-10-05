import { describe, it, expect } from 'vitest';
import capabilities from '../../../src-tauri/capabilities/default.json';

// download.ts only calls save(). The dialog plugin's open command lets the
// page widen file system access to a whole folder tree (CVE-2026-95627),
// so it stays out of the capability.
const granted = capabilities.permissions.map((p) => (typeof p === 'string' ? p : p.identifier));

describe('Tauri capabilities', () => {
  it('grants the save dialog used by downloads', () => {
    expect(granted).toContain('dialog:allow-save');
  });

  it('does not grant the open dialog', () => {
    expect(granted).not.toContain('dialog:default');
    expect(granted).not.toContain('dialog:allow-open');
  });
});
