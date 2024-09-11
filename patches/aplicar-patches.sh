#!/bin/bash

# Use a variável de ambiente INIT_CWD para navegar ao diretório raiz do projeto pai
PROJECT_ROOT=${INIT_CWD}

# Verifica se a pasta node_modules/react-native/Libraries existe
if [ -d "$PROJECT_ROOT/node_modules/react-native/Libraries" ]; then
  # Aplica os patches no react-native do projeto pai
  patch --forward -i "./patches/react-native+0.73.6-log-box-inspector.patch" "$PROJECT_ROOT/node_modules/react-native/Libraries/LogBox/UI/LogBoxInspector.js"
  patch --forward -i "./patches/react-native+0.73.6-modal.patch" "$PROJECT_ROOT/node_modules/react-native/Libraries/Modal/Modal.js"
fi