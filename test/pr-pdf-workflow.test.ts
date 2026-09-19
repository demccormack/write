import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';

const WORKFLOW_PATH = '.github/workflows/pr_pdf_preview.yml';

describe('PR PDF preview workflow', () => {
  test('should generate and upload a sample book PDF on pull requests', async () => {
    const workflow = await readFile(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /^name: PR PDF Preview/m);
    assert.match(workflow, /^on:\n  pull_request:\n/m);
    assert.match(workflow, /run: npm run build/);
    assert.match(workflow, /run: npm run write -- new "My Amazing Book"/);
    assert.match(workflow, /uses: xu-cheng\/latex-action@v3/);
    assert.match(workflow, /working_directory: my-amazing-book/);
    assert.match(workflow, /root_file: main\.tex/);
    assert.match(workflow, /uses: actions\/upload-artifact@v4/);
    assert.match(workflow, /name: my-amazing-book-pdf/);
    assert.match(workflow, /path: my-amazing-book\/main\.pdf/);
  });
});
