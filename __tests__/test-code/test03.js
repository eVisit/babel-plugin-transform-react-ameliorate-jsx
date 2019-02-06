/** @jsx dom1,dom2 */
/** @jsxFrag DomFrag1,DomFrag2 */

import React from 'react';

class MyTestComponent extends React.Component {
  render() {
    return (
      <>
        <View hello={true} {...opts}>
          <React.Fragment>
            <Text stuff>Hello world!</Text>
            <div>
              <span>Cool beans</span>
            </div>
          </React.Fragment>
        </View>
      </>
    );
  }
}
