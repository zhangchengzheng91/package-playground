module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        bugfixes: true,
      },
    ],
    [
      '@babel/preset-typescript',
      {
        allowDeclareFields: true,
      },
    ],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
