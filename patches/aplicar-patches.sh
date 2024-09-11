#!/bin/bash
echo "Diretório atual: $(pwd)"

patch --forward -i ./patches/react-native+0.73.6-log-box-inspector.patch "../../react-native/Libraries/LogBox/UI/LogBoxInspector.js"
patch --forward -i ./patches/react-native+0.73.6-modal.patch "../../react-native/Libraries/Modal/Modal.js"