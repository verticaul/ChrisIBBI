import 'react-native-get-random-values';
import '@walletconnect/react-native-compat';

import { Stack, SplashScreen } from 'expo-router';
import {
  createAppKit,
  defaultConfig,
  AppKit,
} from "@reown/appkit-ethers-react-native";
// Impor GestureHandlerRootView untuk stabilitas modal dan gestur
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Impor hook yang dibutuhkan
import { useFonts } from 'expo-font';
import { useEffect } from 'react';

// Tahan splash screen agar tidak hilang secara otomatis
SplashScreen.preventAutoHideAsync();

// --- Konfigurasi AppKit (GLOBAL) ---
const projectId = "c74306af65922614292f1ebc3749e402";
const metadata = { 
  name: "CineCrypto", 
  description: "Book movie tickets with crypto", 
  url: "https://yourapp.com", 
  icons: ["https://yourapp.com/icon.png"], 
  redirect: { native: "sof4://" }
};
const config = defaultConfig({ metadata });
const sepolia = { 
  chainId: 11155111, 
  name: "Sepolia", 
  currency: "SepoliaETH", 
  explorerUrl: "https://sepolia.etherscan.io", 
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com" 
};
const chains = [sepolia];

createAppKit({ projectId, chains, config, enableAnalytics: true });

export default function RootLayout() {
  // Memuat font kustom jika ada
  const [fontsLoaded] = useFonts({
    // Tambahkan font Anda di sini jika ada, contoh:
    // 'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Sembunyikan splash screen hanya jika font sudah dimuat
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Jangan render apa-apa sampai font selesai dimuat
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="movie/[id]" />
        <Stack.Screen name="booking/[showtimeId]" />
      </Stack>
    
      <AppKit />
    </GestureHandlerRootView>
  );
}
