import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';

const WORKFLOW_PATH = '.github/workflows/pr_pdf_preview.yml';

describe('PR PDF preview workflow', () => {
  test('should generate and upload a sample book PDF on pull requests', async () => {
    const workflow = await readFile(WORKFLOW_PATH, 'utf8');
    const triggerBlock = workflow.match(/^on:\n((?: {2}.*\n?)*)/m);

    assert.match(workflow, /^name: PR PDF Preview/m);
    assert(triggerBlock, 'Workflow should define triggers');
    assert.match(triggerBlock[1], /^  pull_request:\s*$/m);

    assert.match(
      workflow,
      /^  build-pdf-preview:\n[\s\S]*^    runs-on: ubuntu-latest$[\s\S]*^    permissions:\n      contents: read$[\s\S]*- name: Checkout code[\s\S]*uses: actions\/checkout@v4[\s\S]*- name: Setup Node\.js[\s\S]*uses: actions\/setup-node@v4[\s\S]*- name: Install dependencies[\s\S]*run: npm ci[\s\S]*- name: Build project[\s\S]*run: npm run build[\s\S]*- name: Generate sample book project[\s\S]*npm run write -- new ['"]My Amazing Book['"][\s\S]*- name: Build PDF[\s\S]*uses: xu-cheng\/latex-action@v3[\s\S]*working_directory: my-amazing-book[\s\S]*root_file: main\.tex[\s\S]*- name: Upload PDF artifact[\s\S]*uses: actions\/upload-artifact@v4[\s\S]*name: my-amazing-book-pdf[\s\S]*path: my-amazing-book\/main\.pdf/m,
    );
  });
});
