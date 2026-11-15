import { createInterface } from 'node:readline/promises';

export interface Prompt {
  ask(question: string, defaultValue?: string): Promise<string>;
  close(): void;
}

export function createPrompt(): Prompt {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return {
    async ask(question, defaultValue) {
      const suffix = defaultValue ? ` [${defaultValue}]` : '';
      return (
        (await rl.question(`${question}${suffix}: `)).trim() ||
        (defaultValue ?? '')
      );
    },
    close() {
      rl.close();
    },
  };
}
