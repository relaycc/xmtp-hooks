import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: 'cjs/[name].js',
        chunkFileNames: 'cjs/[name]-[hash].js',
      },
      {
        dir: 'dist',
        format: 'esm',
        sourcemap: true,
        entryFileNames: 'esm/[name].js',
        chunkFileNames: 'esm/[name]-[hash].js',
      },
    ],
    plugins: [commonjs(), typescript({ tsconfig: './tsconfig.json' })],
  },
  {
    input: 'src/features/core/lib/xmtp-worker.ts',
    output: [
      {
        dir: 'dist',
        format: 'umd',
        sourcemap: true,
        entryFileNames: 'umd/worker.js',
      },
    ],
    plugins: [
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      nodeResolve({ browser: true }),
    ],
  },
];
