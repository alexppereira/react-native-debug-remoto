import React, { Component } from 'react';
import {
  Animated,
  Dimensions,
  findNodeHandle,
  PixelRatio,
  Platform,
  StyleSheet,
  View,
  NativeModules,
  PermissionsAndroid,
} from 'react-native';
import io from 'socket.io-client';
import axios from 'axios';
import RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import RNViewShot from './specs/NativeRNViewShot';

// Configuração do interceptor do Axios
axios.interceptors.request.use(
  (config) => {
    console.info('🚀 Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      data: config.data,
      params: config.params,
    });
    return config;
  },
  (error) => {
    console.info('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    console.info('✅ Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.info('❌ Response Error:', {
      message: error.message,
      response: error.response
        ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          }
        : 'No response',
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

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

let lastImageHash = '';

async function enviarImagemParaRemoto(servidor: string): Promise<void> {
  const localUri = refSnapshot
    ? await captureRef(refSnapshot, {
        format: 'jpg',
        quality: 0.1,
      })
    : await RNViewShot.takeScreenshot();

  try {
    // Gera o hash da nova imagem
    const currentImageHash = await RNViewShot.generateImageHash(localUri);

    // Verifica se a imagem mudou
    if (currentImageHash === lastImageHash) {
      await RNViewShot.deleteImage(localUri.replace('file://', ''));
      return;
    }

    lastImageHash = currentImageHash; // Atualiza o hash da última imagem

    const formData = new FormData();
    formData.append('image', {
      uri: `${localUri}`,
      type: 'image/jpg',
      name: 'captured_screen.jpg',
    });

    const apiUrl = `${servidor}/upload`;

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

export async function sendLogToServer(
  level: string,
  args: string[],
  urlDebug: string
): Promise<void> {
  try {
    const argsString = JSON.stringify(args);

    await fetch(`${urlDebug}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic YWxleDpjb3JhY2Fvb3V0b25v',
      },
      body: JSON.stringify({
        level,
        message: argsString,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // console.error('Failed to send log to server', error);
  }
}

async function atualizarBundle(urlServidor: string): Promise<void> {
  try {
    console.info('Iniciando download do novo bundle...');

    // Caminho do bundle no Android usando CachesDirectoryPath
    const bundlePath = `${RNFS.CachesDirectoryPath}/index.android.bundle`;
    const tempBundlePath = `${bundlePath}.temp`;

    // URL do servidor para download do bundle
    const bundleUrl = `${urlServidor}/bundle/download`;

    console.info('Baixando bundle de:', bundleUrl);
    console.info('Salvando em:', bundlePath);

    // Download do arquivo com autenticação básica
    const response = await fetch(bundleUrl, {
      headers: {
        Authorization: 'Basic YWxleDpjb3JhY2Fvb3V0b25v', // alex:coracaooutono em Base64
      },
    });
    console.info('Finalizou download');

    if (!response.ok) {
      throw new Error(
        `Erro ao baixar bundle: ${response.status} ${response.statusText}`
      );
    }

    // Criar diretório de cache se não existir
    const bundleDir = RNFS.CachesDirectoryPath;
    const dirExists = await RNFS.exists(bundleDir);
    console.info('Inicio verificando/criando diretorio:', bundleDir);
    if (!dirExists) {
      await RNFS.mkdir(bundleDir);
    }

    // Salvar o bundle em chunks
    console.info('Inicio salvando arquivo temporario:', tempBundlePath);
    try {
      const blob = await response.blob();
      const fileReader = new FileReader();

      // Criar uma Promise para aguardar a leitura do arquivo
      const readFileAsText = () =>
        new Promise<string>((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result as string);
          fileReader.onerror = reject;
          fileReader.readAsText(blob);
        });

      console.info('Iniciando leitura do blob');
      const content = await readFileAsText();
      console.info('Finalizou leitura do blob, tamanho:', content.length);

      // Salvar em chunks de 1MB
      const chunkSize = 1024 * 1024; // 1MB
      const totalChunks = Math.ceil(content.length / chunkSize);

      console.info(
        'Iniciando escrita em chunks, total de chunks:',
        totalChunks
      );

      // Criar arquivo vazio
      await RNFS.writeFile(tempBundlePath, '', 'utf8');

      // Escrever chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize, content.length);
        const chunk = content.slice(start, end);

        console.info(`Escrevendo chunk ${i + 1}/${totalChunks}`);
        await RNFS.appendFile(tempBundlePath, chunk, 'utf8');
      }

      console.info('Finalizou salvando arquivo temporario');
    } catch (writeError) {
      console.error('Erro ao escrever arquivo temporário:', writeError);
      throw writeError;
    }

    // Verificar se o arquivo foi salvo corretamente
    console.info('Inicio verificando se o arquivo foi salvo corretamente');
    const exists = await RNFS.exists(tempBundlePath);
    if (!exists) {
      throw new Error('Falha ao salvar o arquivo temporário');
    }
    console.info('Finalizou verificando se o arquivo foi salvo corretamente');

    // Substituir o bundle antigo pelo novo
    console.info('Inicio movendo arquivo temporário para destino final');
    try {
      await RNFS.moveFile(tempBundlePath, bundlePath);
      console.info('Bundle movido com sucesso para:', bundlePath);
    } catch (moveError) {
      console.error('Erro ao mover arquivo:', moveError);
      throw moveError;
    }

    console.info('Bundle atualizado com sucesso!');
    const socket = io(urlServidor);

    // Reiniciar o app após 2 segundos
    setTimeout(() => {
      console.info('Reiniciando o app...');
      socket.close();
      onRefParaCaptura(null);
      setTimeout(() => {
        RNViewShot.restartApp();
      }, 300);
    }, 2000);
  } catch (error: any) {
    // Melhor tratamento do erro
    console.error('Erro ao atualizar bundle:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error,
    });
  }
}

export function inicializarDebugControleRemoto(
  axiosInstances: any[] = [],
  urlDebug: string = 'http://alexpereira.net.br:3000',
  intervaloDeAtualizacao: number = 500
): () => void {
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  // Configurar interceptors para a instância global do axios
  axios.interceptors.request.use(
    (config) => {
      console.info('🚀 Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        headers: config.headers,
        data: config.data,
        params: config.params,
      });
      return config;
    },
    (error) => {
      console.info('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => {
      console.info('✅ Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        data: response.data,
      });
      return response;
    },
    (error) => {
      console.info('❌ Response Error:', {
        message: error.message,
        response: error.response
          ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
            }
          : 'No response',
        url: error.config?.url,
      });
      return Promise.reject(error);
    }
  );

  // Configurar interceptors para cada instância personalizada
  axiosInstances.forEach((instance) => {
    instance.interceptors.request.use(
      (config) => {
        console.info('🚀 Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
          data: config.data,
          params: config.params,
        });
        return config;
      },
      (error) => {
        console.info('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    instance.interceptors.response.use(
      (response) => {
        console.info('✅ Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error) => {
        console.info('❌ Response Error:', {
          message: error.message,
          response: error.response
            ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
              }
            : 'No response',
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  });

  console.log = (...args) => {
    sendLogToServer('log', args, urlDebug);
    originalConsoleLog(...args);
  };

  console.info = (...args) => {
    sendLogToServer('info', args, urlDebug);
    originalConsoleInfo(...args);
  };

  console.warn = (...args) => {
    sendLogToServer('warn', args, urlDebug);
    originalConsoleWarn(...args);
  };

  console.error = (...args) => {
    sendLogToServer('error', args, urlDebug);
    originalConsoleError(...args);
  };

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

  socket.on('retart-app', () => {
    console.info('Reiniciando o app...');
    socket.close();
    onRefParaCaptura(null);
    setTimeout(() => {
      RNViewShot.restartApp();
    }, 300);
  });

  socket.on('texto', (data) => {
    const { texto } = data;
    console.log(`Digitando texto: ${texto}`);

    simularDigitarTexto(texto);
  });

  socket.on('atualizar-bundle', () => {
    console.info('Recebido comando para atualizar bundle');
    atualizarBundle(urlDebug);
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
