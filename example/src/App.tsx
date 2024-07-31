import { useEffect, useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import {
  inicializarDebugControleRemoto,
  Modal,
} from 'react-native-debug-remoto';

const TextInputExample = () => {
  const [text, setText] = useState('');

  useEffect(() => {
    const resetarEstados = inicializarDebugControleRemoto();

    return () => {
      resetarEstados();
    };
  }, []);

  const handleTextChange = (inputText: string) => {
    setText(inputText);
  };

  const handleButtonPress = () => {
    console.log('Valor de entrada de texto: ', text);
    setText('');
  };

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={styles.container} accessibilityLabel="modal-view">
        <TextInput
          style={styles.input}
          placeholder="Digite algo remoto, acesse http://alexpereira.net.br:3000"
          value={text}
          onChangeText={handleTextChange}
        />
        <Button title="ENVIAR" onPress={handleButtonPress} />
        <Text style={styles.text}>Texto inserido: {text}</Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default TextInputExample;
