const babel = require("@babel/core"),
      FS = require('fs'),
      PATH = require('path'),
      pluginReactAmeliorateJSX = require('../src');

// Date mock
require('jest-mock-now')();

function transform(code, extraOpts, extraBabelOpts) {
  return new Promise((resolve, reject) => {
    var babelOpts = Object.assign({
      code: true,
      ast: false,
      babelrc: false,
      plugins: [
        [pluginReactAmeliorateJSX, Object.assign({}, extraOpts || {})]
      ]
    }, extraBabelOpts);

    babel.transform(
      ('' + code),
      babelOpts,
      function(error, result) {
        if (error)
          return reject(error);

        resolve(result);
      }
    );
  });
}

function transformFile(fileName, extraOpts) {
  var fullFileName = (PATH.join(__dirname, 'test-code', fileName) + '.js');
  return transform(FS.readFileSync(fullFileName), extraOpts, { filename: fullFileName });
}

describe('babel-preset-react-ameliorate', function () {
  it('should work with default options', async function() {
    var result = await transformFile('test01');
    expect(result.code).toMatchSnapshot();
  });

  it('should work with custom options', async function() {
    var result = await transformFile('test02', {
      pragma: '_customCreateElement,React.createElement',
      pragmaFrag: '_customCreateFragmentElement,React.Fragment',
    });

    expect(result.code.indexOf('_customCreateElement ||')).toBeGreaterThan(-1);
    expect(result.code.indexOf('_customCreateFragmentElement ||')).toBeGreaterThan(-1);
    expect(result.code).toMatchSnapshot();
  });

  it('should work with inline options', async function() {
    var result = await transformFile('test03');
    expect(result.code.indexOf('dom1 || dom2')).toBeGreaterThan(-1);
    expect(result.code.indexOf('DomFrag1 || DomFrag2')).toBeGreaterThan(-1);
    expect(result.code).toMatchSnapshot();
  });
});
