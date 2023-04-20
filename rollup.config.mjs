import typescript from '@rollup/plugin-typescript';

export default [{
  input: 'src/index.ts',
  output: {
    file: 'build/cylindrical-panorama-viewer.js'
  },
  plugins: [
    typescript({tsconfig: 'tsconfig.json'}),
  ]
}]
