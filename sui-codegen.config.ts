import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: 'hashi',
			path: '../hashi/packages/hashi',
		},
	],
};

export default config;
