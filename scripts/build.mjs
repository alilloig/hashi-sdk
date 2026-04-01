/**
 * Build script that replicates @mysten/build-scripts behavior:
 * - Builds CJS and ESM bundles via esbuild
 * - Emits .d.ts declarations via tsc for both formats
 * - Writes dist/cjs/package.json (type: commonjs) and dist/esm/package.json (type: module)
 */

import { build } from 'esbuild';
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';

const ignorePatterns = [/\.test\.ts$/, /\.spec\.ts$/];

async function findAllFiles(dir, files = []) {
	const dirFiles = await fs.readdir(dir);
	for (const file of dirFiles) {
		const filePath = path.join(dir, file);
		const fileStat = await fs.stat(filePath);
		if (fileStat.isDirectory()) {
			await findAllFiles(filePath, files);
		} else if (!ignorePatterns.some((pattern) => pattern.test(filePath))) {
			files.push(filePath);
		}
	}
	return files;
}

async function clean() {
	const distDir = path.join(process.cwd(), 'dist');
	if (existsSync(distDir)) {
		await fs.rm(distDir, { recursive: true, force: true });
	}
	await fs.mkdir(distDir, { recursive: true });
}

async function buildCJS(entryPoints) {
	await Promise.all([
		build({
			format: 'cjs',
			logLevel: 'error',
			target: 'es2020',
			entryPoints,
			outdir: 'dist/cjs',
			sourcemap: true,
			outbase: 'src',
		}),
		buildTypes('tsconfig.json'),
	]);

	await fs.writeFile(
		path.join(process.cwd(), 'dist/cjs/package.json'),
		JSON.stringify({ private: true, type: 'commonjs' }, null, 2),
	);
}

async function buildESM(entryPoints) {
	await build({
		format: 'esm',
		logLevel: 'error',
		target: 'es2020',
		entryPoints,
		outdir: 'dist/esm',
		sourcemap: true,
		outbase: 'src',
	});

	await buildTypes('tsconfig.esm.json');

	await fs.writeFile(
		path.join(process.cwd(), 'dist/esm/package.json'),
		JSON.stringify({ private: true, type: 'module' }, null, 2),
	);
}

function buildTypes(config) {
	execFileSync('npx', ['tsc', '--project', config], { stdio: 'inherit' });
}

async function main() {
	const allFiles = await findAllFiles(path.join(process.cwd(), 'src'));
	await clean();
	console.log('Building CJS...');
	await buildCJS(allFiles);
	console.log('Building ESM...');
	await buildESM(allFiles);
	console.log('Build complete.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
