import ts from 'rollup-plugin-ts';

export default [{
  input: 'src/index.ts',
  output: {
    file: 'build/cylindrical-panorama-viewer.js',
    sourcemap: true
  },
  plugins: [
      ts({
        tsconfig: 'tsconfig.json',

      }),
  ],
  external: [
      "three",
  ]
}]
