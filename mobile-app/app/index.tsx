import { useRef } from 'react';
import { StyleSheet, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Haptics from 'expo-haptics';

import Constants from 'expo-constants';
import appConfig from '../app.json';

/**
 * Componente contenedor de la aplicación móvil en Expo.
 * Renderiza la interfaz web del frontend dentro de una WebView a pantalla completa
 * e intercepta mensajes del Platform Bridge para ejecutar APIs nativas del teléfono.
 * @returns {JSX.Element} Vista del contenedor móvil.
 */
export default function App() {
  const webViewRef = useRef<WebView>(null);
  const frontendUrl = process.env.EXPO_PUBLIC_FRONTEND_URL;

  if (!frontendUrl) {
    return (
      <View style={styles.center}>
        <Text>⚠️ Falta configurar EXPO_PUBLIC_FRONTEND_URL en tu archivo .env</Text>
      </View>
    );
  }

  /**
   * Manejador de mensajes entrantes desde el frontend web a través del Platform Bridge.
   * @param {WebViewMessageEvent} event - Evento con el mensaje recibido en formato JSON.
   */
  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { type, payload } = data;

      switch (type) {
        case 'GET_VERSION': {
          let appVer = '1.0.0';
          try {
            appVer = appConfig.expo.version || Constants?.expoConfig?.version || '1.0.0';
          } catch (e) {}
          
          const script = `
            try {
              window.postMessage(JSON.stringify({ type: 'VERSION_RESULT', payload: '${appVer}' }), '*');
            } catch(e) {}
            true;
          `;
          webViewRef.current?.injectJavaScript(script);
          break;
        }

        case 'HAPTIC_FEEDBACK': {
          if (payload?.type === 'success') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (payload?.type === 'error') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } else if (payload?.type === 'warning') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          break;
        }

        case 'PING': {
          /** Responde al frontend confirmando la recepción nativa en móvil */
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'pingResult',
              payload: `[Expo Mobile] Pong recibido de forma nativa: "${payload?.message || ''}"`,
            })
          );
          break;
        }

        default:
          console.log('[Expo Host] Mensaje no manejado:', type, payload);
          break;
      }
    } catch (err) {
      console.error('[Expo Host] Error al procesar mensaje de WebView:', err);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <WebView
        ref={webViewRef}
        source={{ uri: frontendUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});