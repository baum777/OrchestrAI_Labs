/**
 * Tests for Document Header Validator
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DocumentHeaderValidator } from '../document-header-validator.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('DocumentHeaderValidator', () => {
  const validator = new DocumentHeaderValidator();
  let testFilePath: string;

  beforeEach(() => {
    const testDir = os.tmpdir();
    testFilePath = path.join(testDir, 'test-doc.md');
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should pass valid document with all required fields', () => {
    const content = `# Test Document

**Version:** 1.0.0  
**Owner:** @test_owner  
**Layer:** strategy  
**Last Updated:** 2026-02-13  
**Definition of Done:**
- [ ] Criterion 1
- [ ] Criterion 2

---

Content
`;

    fs.writeFileSync(testFilePath, content);
    const result = validator.validateDocument(testFilePath);
    expect(result.status).toBe('pass');
  });

  it('should block document without version header', () => {
    const content = `# Test Document

**Owner:** @test_owner  
**Layer:** strategy  
**Last Updated:** 2026-02-13  
**Definition of Done:**
- [ ] Criterion 1

---

Content
`;

    fs.writeFileSync(testFilePath, content);
    const result = validator.validateDocument(testFilePath);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('missing_header_version');
  });

  it('should block document without owner', () => {
    const content = `# Test Document

**Version:** 1.0.0  
**Layer:** strategy  
**Last Updated:** 2026-02-13  
**Definition of Done:**
- [ ] Criterion 1

---

Content
`;

    fs.writeFileSync(testFilePath, content);
    const result = validator.validateDocument(testFilePath);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('missing_owner');
  });

  it('should block document without DoD', () => {
    const content = `# Test Document

**Version:** 1.0.0  
**Owner:** @test_owner  
**Layer:** strategy  
**Last Updated:** 2026-02-13

---

Content
`;

    fs.writeFileSync(testFilePath, content);
    const result = validator.validateDocument(testFilePath);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('missing_dod');
  });

  it('should block document with invalid layer', () => {
    const content = `# Test Document

**Version:** 1.0.0  
**Owner:** @test_owner  
**Layer:** invalid_layer  
**Last Updated:** 2026-02-13  
**Definition of Done:**
- [ ] Criterion 1

---

Content
`;

    fs.writeFileSync(testFilePath, content);
    const result = validator.validateDocument(testFilePath);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('invalid_layer_tag');
  });

  it('should validate content string directly', () => {
    const validContent = `# Test Document

**Version:** 1.0.0  
**Owner:** @test_owner  
**Layer:** strategy  
**Last Updated:** 2026-02-13  
**Definition of Done:**
- [ ] Criterion 1

---

Content
`;

    const result = validator.validateContent(validContent);
    expect(result.status).toBe('pass');
  });

  it('should block content without required fields', () => {
    const invalidContent = `# Test Document

**Version:** 1.0.0

---

Content
`;

    const result = validator.validateContent(invalidContent);
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('missing_owner');
    expect(result.reasons).toContain('missing_layer_tag');
    expect(result.reasons).toContain('missing_last_updated');
    expect(result.reasons).toContain('missing_dod');
  });
});

