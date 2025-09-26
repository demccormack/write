import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  version: string;
  displayName: string;
  [key: string]: unknown;
}

const packageJson: PackageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
);

export const version = packageJson.version;
export const displayName = packageJson.displayName;

export default packageJson;
