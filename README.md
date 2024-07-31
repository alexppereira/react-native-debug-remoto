# react-native-debug-remoto

Permite debug e controle remoto da aplicação

## Installation

```sh
yarn add git+https://github.com/alexppereira/react-native-debug-remoto.git
```

## Usage


```js
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { inicializarDebugControleRemoto } from 'react-native-debug-remoto';

const App = () => {
  useEffect(() => {
    // Inicializa a biblioteca
    const resetarEstados = inicializarDebugControleRemoto();

    // Limpeza na desmontagem do componente
    return () => {
      resetarEstados();
    };
  }, []);

  return (
    <View>
      <Text>Bem-vindo ao React Native Debug Remoto!</Text>
    </View>
  );
};

export default App;
```


## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
