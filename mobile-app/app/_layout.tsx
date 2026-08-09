import { Stack } from 'expo-router';

/**
 * Layout principal de navegación para Expo Router.
 * Configura la pila de pantallas sin cabecera por defecto.
 * @returns {JSX.Element} Pila de navegación Stack.
 */
export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}