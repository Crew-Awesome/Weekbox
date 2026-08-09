import { useRef } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Haptics from 'expo-haptics';

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <WebView
        ref={webViewRef}
        source={{ uri: frontendUrl }}
        style={styles.webview}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
      />
    </SafeAreaView>
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