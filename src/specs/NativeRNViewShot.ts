import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  releaseCapture: () => string;
  captureRef: (tag: number, options: Object) => Promise<string>;
  captureScreen: (options: Object) => Promise<string>;
  deleteImage: (filePath: string) => Promise<string>;
  simulateClick: (x: number, y: number) => Promise<boolean>;
  insertText: (text: string) => Promise<boolean>;
  takeScreenshot: () => Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RNViewShot');
