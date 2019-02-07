/*
MIT License

Copyright (c) 2014-present Sebastian McKenzie and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const helperUtils = require("@babel/helper-plugin-utils"),
      jsx         = require("@babel/plugin-syntax-jsx").default,
      helper      = require("@babel/helper-builder-react-jsx").default,
      babelTypes  = require("@babel/core").types;

module.exports = helperUtils.declare((api, options) => {
  api.assertVersion(7);

  const THROW_IF_NAMESPACE = (options.throwIfNamespace === undefined) ? true : !!options.throwIfNamespace,
        PRAGMA_DEFAULT = (options.pragma || "this._raCreateElement,React.createElement").trim(),
        PRAGMA_FRAG_DEFAULT = (options.pragmaFrag || "React.Fragment").trim(),
        JSX_ANNOTATION_REGEX = /\*?\s*@jsx\s+([^\s]+)/,
        JSX_FRAG_ANNOTATION_REGEX = /\*?\s*@jsxFrag\s+([^\s]+)/;

  // returns a closure that returns an identifier or memberExpression node
  // based on the given id
  const createIdentifierParser = (_id) => {
    const createMemberExpressionSub = (thisID) => {
      return thisID
        .split(".")
        .map((name) => babelTypes.identifier(name))
        .reduce((object, property) => {
          return babelTypes.memberExpression(object, property)
        });
    };

    const createMemberExpression = (thisID) => {
      var memberExpression = createMemberExpressionSub(thisID);
      if (thisID.substring(0, 5) === 'this.') {
        return babelTypes.logicalExpression('&&', babelTypes.thisExpression(), memberExpression);
      } else {
        return memberExpression;
      }
    };

    var ids = ('' + _id).split(/\s*,\s*/);

    return () => {
      var previousExpression = createMemberExpression(ids[0]);
      for (var i = 1, il = ids.length; i < il; i++) {
        var memberExpression = createMemberExpression(ids[1]);
        previousExpression = babelTypes.logicalExpression('||', previousExpression, memberExpression);
      }

      return previousExpression;
    };
  };

  const visitor = helper({
    pre(state) {
      const tagName = state.tagName;
      const args = state.args;
      if (babelTypes.react.isCompatTag(tagName)) {
        args.push(babelTypes.stringLiteral(tagName));
      } else {
        args.push(state.tagExpr);
      }
    },

    post(state, pass) {
      state.callee = pass.get("jsxIdentifier")();
    },

    throwIfNamespace: THROW_IF_NAMESPACE,
  });

  visitor.Program = {
    enter(path, state) {
      var { file } = state,
          pragma = PRAGMA_DEFAULT,
          pragmaFrag = PRAGMA_FRAG_DEFAULT,
          pragmaSet = !!options.pragma,
          pragmaFragSet = !!options.pragmaFrag,
          comments = file.ast.comments || [];

      for (var i = 0, il = comments.length; i < il; i++) {
        var comment = comments[i],
            jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value),
            jsxFragMatches = JSX_FRAG_ANNOTATION_REGEX.exec(comment.value);

        if (jsxMatches) {
          pragma = jsxMatches[1];
          pragmaSet = true;
        }

        if (jsxFragMatches) {
          pragmaFrag = jsxFragMatches[1];
          pragmaFragSet = true;
        }
      }

      state.set("jsxIdentifier", createIdentifierParser(pragma));
      state.set("jsxFragIdentifier", createIdentifierParser(pragmaFrag));
      state.set("usedFragment", false);
      state.set("pragmaSet", pragmaSet);
      state.set("pragmaFragSet", pragmaFragSet);
    },
    exit(path, state) {
      if (state.get("pragmaSet") && state.get("usedFragment") && !state.get("pragmaFragSet")) {
        throw new Error("transform-react-ameliorate-jsx: pragma has been set but pragmafrag has not been set");
      }
    },
  };

  visitor.JSXAttribute = function(path) {
    if (babelTypes.isJSXElement(path.node.value))
      path.node.value = babelTypes.jsxExpressionContainer(path.node.value);
  };

  return {
    name: "transform-react-jsx",
    inherits: jsx,
    visitor,
  };
});
