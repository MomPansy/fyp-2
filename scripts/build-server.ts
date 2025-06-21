import { readFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

(async () => {
  await build({
    entryPoints: ['server/index.ts', 'server/**/*.ts', 'server/**/*.js', 'server/**/*.json'],
    tsconfig: 'tsconfig.json',
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outdir: 'dist',
    plugins: [
      {
        // This plugin is written by o1 model (mostly)
        name: 'transform-imports',
        setup(build) {
          // Determine the root directory of the project
          const projectRoot =
            build.initialOptions.absWorkingDir ?? process.cwd();

          // Intercept load events for TypeScript files
          build.onLoad({ filter: /\.ts$/ }, async (args) => {
            const source = await readFile(args.path, 'utf8');

            // Regular expression to match import statements
            const importRegex =
              /import\s+([\s\S]*?)\s+from\s+(['"])([^'"]+?)\2/g;

            // Replace matched import statements
            const updatedSource = source.replace(
              importRegex,
              (match, imports: string, quote: string, importPath: string) => {
                let newImportPath = importPath;
                const importingFileDir = path.dirname(args.path);

                if (importPath.startsWith('server/')) {
                  // Handle 'server/...' imports by calculating the relative path
                  const serverRelativePath = importPath.substring(
                    'server/'.length,
                  );

                  // Absolute path to the target module in 'server' directory
                  const targetModulePath = path.resolve(
                    projectRoot,
                    'server',
                    serverRelativePath,
                  );

                  // Compute the relative path from the importing file to the target module
                  let relativePath = path.relative(
                    importingFileDir,
                    targetModulePath,
                  );

                  // Replace extension with '.js'
                  relativePath = relativePath.replace(/\.[jt]sx?$/, '.js');

                  // Convert to POSIX-style path (replacing backslashes with slashes)
                  newImportPath = relativePath.split(path.sep).join('/');

                  // Ensure the relative path starts with './' or '../'
                  if (!newImportPath.startsWith('.')) {
                    newImportPath = './' + newImportPath;
                  }
                } else if (
                  importPath.startsWith('./') ||
                  importPath.startsWith('../')
                ) {
                  // Handle relative imports by replacing '.ts' or '.tsx' with '.js'
                  newImportPath = importPath.replace(/\.[tj]sx?$/, '.js');
                }
                // else: Leave other imports (e.g., node_modules) unchanged
                // Return the updated import statement
                return `import ${imports} from ${quote}${newImportPath}${quote}`;
              },
            );

            return {
              contents: updatedSource,
              loader: 'ts', // Use the TypeScript loader
            };
          });
        },
      },
    ],
  });
  try {
    await cp(
      path.join(process.cwd(), 'server', 'drizzle', 'migrations'),
      path.join(process.cwd(), 'dist', 'drizzle', 'migrations'),
      { recursive: true }
    );
    console.log('SQL migration files copied successfully');
  } catch (error) {
    console.error('Error copying SQL migration files:', error);
  }
})().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});