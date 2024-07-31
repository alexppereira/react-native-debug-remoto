import React from 'react';
import {
  Animated,
  Dimensions,
  NativeModules,
  PixelRatio,
  Platform,
  StyleSheet,
} from 'react-native';
import io from 'socket.io-client';

const LINKING_ERROR =
  `The package 'react-native-debug-remoto' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const DebugRemoto = NativeModules.DebugRemoto
  ? NativeModules.DebugRemoto
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const porcentagemParaPixels = (percentage: number, totalPixels: number) => {
  return (percentage / 100) * totalPixels;
};

export const simularClickPassandoPorcentagem = (
  porcentagemX: number,
  porcentagemY: number
): Promise<boolean> => {
  const SCREEN_WIDTH = PixelRatio.getPixelSizeForLayoutSize(
    Dimensions.get('window').width
  );
  const SCREEN_HEIGHT = PixelRatio.getPixelSizeForLayoutSize(
    Dimensions.get('window').height
  );

  const x = porcentagemParaPixels(porcentagemX, SCREEN_WIDTH);
  const y = porcentagemParaPixels(porcentagemY, SCREEN_HEIGHT);

  return new Promise((resolve, reject) => {
    DebugRemoto.simulateClick(x, y)
      .then((result: boolean) => resolve(result))
      .catch((error: any) => reject(error));
  });
};

export const simularDigitarTexto = (texto: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    DebugRemoto.insertText(texto)
      .then((result: boolean) => resolve(result))
      .catch((error: any) => reject(error));
  });
};

async function enviarImagemParaRemoto(servidor: string): Promise<void> {
  if (!DebugRemoto?.takeScreenshot) {
    console.error(
      'DebugRemoto.takeScreenshot não está definido. Verifique a ligação nativa.'
    );
    return;
  }

  const localUri = await DebugRemoto.takeScreenshot();

  const formData = new FormData();
  formData.append('image', {
    uri: `file://${localUri}`,
    type: 'image/png',
    name: 'captured_screen.png',
  });

  const apiUrl = `${servidor}/upload`;

  try {
    await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': 'Basic YWxleDpjb3JhY2Fvb3V0b25v',
      },
    });
  } catch (error) {
    console.error('Erro ao enviar imagem:', error);
  }

  await DebugRemoto.deleteImage(localUri);
}

export function inicializarDebugControleRemoto(
  urlDebug: string = 'http://alexpereira.net.br:3000',
  intervaloDeAtualizacao: number = 1000
): () => void {
  const socket = io(urlDebug);

  socket.on('connect', () => {
    console.log('Conectado ao servidor de sockets');
  });

  socket.on('disconnect', () => {
    console.log('Desconectado do servidor de sockets');
  });

  socket.on('click', (data) => {
    const { xPorcentagem, yPorcentagem } = data;
    console.log(`Clique na imagem: X = ${xPorcentagem}%, Y = ${yPorcentagem}%`);

    simularClickPassandoPorcentagem(xPorcentagem, yPorcentagem);
  });

  socket.on('texto', (data) => {
    const { texto } = data;
    console.log(`Digitando texto: ${texto}`);

    simularDigitarTexto(texto);
  });

  const timer = setInterval(() => {
    enviarImagemParaRemoto(urlDebug);
  }, intervaloDeAtualizacao);

  const resetarEstados = () => {
    socket.disconnect();
    clearInterval(timer);
  };

  return resetarEstados;
}

interface ModalProps {
  visible: boolean;
  children: React.ReactNode;
  transparent?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  onClose?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
}

const height = Dimensions.get('window').height;
export const Modal: React.FC<ModalProps> = ({ visible, children }) => {
  const [modalVisible, setModalVisible] = React.useState(visible);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [fadeAnim, slideAnim, visible]);

  if (!modalVisible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 20,
    position: 'absolute',
    bottom: 0,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
