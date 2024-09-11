#!/bin/bash

patch --forward -i ./patches/react-native+0.73.6-log-box-inspector.patch "./node_modules/react-native/Libraries/LogBox/UI/LogBoxInspector.js"
patch --forward -i ./patches/react-native+0.73.6-modal.patch "./node_modules/react-native/Libraries/Modal/Modal.js"